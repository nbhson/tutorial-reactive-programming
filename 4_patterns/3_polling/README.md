# Smart Polling Pattern

## 🌟 Tổng quan

Polling là kỹ thuật gọi API định kỳ để cập nhật dữ liệu mới nhất (ví dụ: Chat, Tin tức, Giá chứng khoán, trạng thái đơn hàng). Tuy nhiên, polling "ngây thơ" bằng `setInterval` thường gặp ba vấn đề chết người:

```javascript
// ❌ Polling ngây thơ
setInterval(async () => {
  const data = await fetch('/api/status').then((r) => r.json());
  render(data);
}, 5000);
// 1. Không dừng được — chạy mãi kể cả khi tab đã ẩn
// 2. Chồng chéo — nếu request chậm > 5s, các request chồng lên nhau
// 3. Không có retry — API lỗi 1 lần thì ... vẫn chạy tiếp nhưng lỗi không được xử lý
```

## 💎 Giá trị cốt lõi

Pattern này dùng RxJS giải quyết triệt để cả ba vấn đề:

1.  **Pause/Resume**: tự dừng polling khi tab ẩn (`visibilitychange`) hoặc user bật chế độ pause.
2.  **Concurrency Control**: dùng `switchMap`/`exhaustMap` để đảm bảo không gọi chồng chéo API.
3.  **Error Handling + Backoff**: dùng `retry({ delay })` để tự động thử lại với khoảng cách tăng dần (exponential backoff) — và quan trọng hơn: **một lỗi đơn lẻ không giết được vòng polling**.

## 🏗 Cấu trúc Pattern

```mermaid
graph TD
    Start(Start/Stop Signal) --> SwitchMap{switchMap}
    SwitchMap -->|Start| Timer(timer(0, interval))
    Timer --> CallAPI(Mock API Call)
    CallAPI -->|Success| UI(Render)
    CallAPI -->|Error| Retry(Retry with Backoff)
    Retry --> CallAPI
    VisibilityChange(visibilitychange) --> Start
```

Chìa khóa kiến trúc: **tín hiệu điều khiển (start/stop) là stream, vòng lặp là stream con**. `switchMap` gắn tháo vòng lặp theo tín hiệu — dừng polling không phải bằng cờ boolean mà bằng việc phát một giá trị trên stream điều khiển.

## 💡 Ví dụ hoàn chỉnh

Xem file `polling.js`. Dưới đây là bản TypeScript đầy đủ:

```typescript
import {
  fromEvent, timer, EMPTY, Subject, merge, BehaviorSubject,
} from 'rxjs';
import {
  switchMap, retry, takeUntil, tap, finalize, filter, withLatestFrom,
} from 'rxjs';

// ── Tín hiệu điều khiển ─────────────────────────────────────────
const startPolling$ = new Subject<void>();
const stopPolling$  = new Subject<void>();

// Dừng tự động khi tab ẩn — người dùng không nhìn thấy thì đừng tốn tài nguyên
const hidden$ = fromEvent(document, 'visibilitychange').pipe(
  switchMap(() => (document.hidden ? stopPolling$ : startPolling$))
);

// ── Vòng polling ────────────────────────────────────────────────
const POLL_INTERVAL = 5000;

const poll$ = merge(startPolling$, hidden$).pipe(
  switchMap(() =>
    timer(0, POLL_INTERVAL).pipe(
      // Mỗi tick → một request. switchMap bên trong: nếu request trước chưa xong
      // mà tick tới (API chậm > 5s), HỦY request cũ — không chồng chéo.
      switchMap(() => fetchStatus()),
      tap((data) => render(data)),
      // Lỗi đơn lẻ KHÔNG được giết vòng polling:
      // retry với exponential backoff 1s → 2s → 4s → 8s (tối đa 30s)
      retry({
        delay: (_error, retryCount) => {
          const backoffMs = Math.min(1000 * 2 ** (retryCount - 1), 30_000);
          console.warn(`API lỗi, thử lại sau ${backoffMs}ms (lần ${retryCount})`);
          return timer(backoffMs);
        },
      }),
      takeUntil(stopPolling$)
    )
  )
);
```

Đọc kỹ hai tầng `switchMap`:

- **Tầng ngoài** (`switchMap(() => timer(0, POLL_INTERVAL).pipe(...))`): phát một giá trị trên `startPolling$` → mở một vòng polling; phát trên `stopPolling$` → **hủy nguyên vòng** (unsubscribe timer + request đang chạy).
- **Tầng trong** (`switchMap(() => fetchStatus())`): request chậm hơn chu kỳ → tick mới hủy request cũ. Nếu nghiệp vụ đòi hỏi mỗi tick **bắt buộc** phải có một request (không được bỏ tick nào), thay bằng `concatMap`; nếu không muốn bỏ tick nhưng cũng không hủy, dùng `exhaustMap`.

## 🔁 Retry với Exponential Backoff — kỹ thuật trọng tâm

`retry({ delay })` (RxJS 7.2+, thay cho `retryWhen` đã deprecated) cho phép quyết định **khi nào thử lại** dựa trên số lần đã thử:

```typescript
function fetchStatusWithBackoff() {
  return timer(0, POLL_INTERVAL).pipe(
    switchMap(() => fetchStatus()),
    retry({
      delay: (_err, count) => timer(Math.min(1000 * 2 ** (count - 1), 30_000)),
      // count = 1: chờ 1s ; count = 2: 2s ; count = 3: 4s ; ... cap 30s
    })
  );
}
```

Timeline minh họa (API lỗi 3 lần liên tiếp):

```text
tick:   0s        5s        10s
req:    ──✗       ──✗        ──✗──✓
backoff:   retry sau 1s  retry sau 2s  retry sau 4s
```

Bốn quyết định thiết kế khi thêm retry vào polling:

1.  **Giới hạn số lần**: `retry({ delay, count: 5 })` — hết số lần thì lỗi bắn ra ngoài; nếu bạn đã `catchError` sau đó, vòng polling **chết thật** (complete). Cân nhắc: có khi chết vòng polling và báo user còn đúng hơn là retry vô hạn.
2.  **Chỉ retry lỗi "retryable"**: lỗi 429/5xx/timeouts đáng retry; lỗi 401/403 retry bao nhiêu cũng vậy — nên phân loại trong hàm `delay` và `throwError(() => ...)` để thoát ngay.
3.  **Thêm jitter** (nhiễu ngẫu nhiên) khi có nhiều client cùng polling một server: `timer(1000 * 2 ** (count - 1) + Math.random() * 500)` — tránh "thundering herd" cùng đánh server đúng một thời điểm.
4.  **Đặt `retry` ở đúng tầng**: trong ví dụ trên, `retry` nằm **bên trong** vòng `timer` — nghĩa là backoff chỉ trì hoãn request tiếp theo mà không phá nhịp polling. Đặt nhầm `retry` bên ngoài `switchMap` tầng ngoài sẽ khiến cả vòng polling chết sau khi hết số lần retry.

## ⏸ Pause/Resume nâng cao: dừng cả nhịp giữa chừng

Với `visibilitychange` ở trên, khi tab ẩn vòng polling bị hủy. Nếu yêu cầu là **"tạm dừng nhịp nhưng giữ vị trí"**, dùng `windowToggle` hoặc điều kiện trong `filter`:

```typescript
const paused$ = new BehaviorSubject(false);
fromEvent(pauseBtn, 'click').subscribe(() => paused$.next(!paused$.value));

const poll$ = timer(0, POLL_INTERVAL).pipe(
  withLatestFrom(paused$),
  filter(([, paused]) => !paused),
  switchMap(() => fetchStatus())
);
// Cách này bỏ tick khi đang pause, không hủy stream — nhịp tiếp tục khi resume.
```

## ⚠️ Những cạm bẫy

1.  **Polling kiểu `interval + mergeMap`** — request chậm sẽ chồng chất vô hạn khi server quá tải, khiến nó càng chậm hơn. Luôn dùng `switchMap`/`concatMap`/`exhaustMap`, không bao giờ `mergeMap` không giới hạn.
2.  **Quên `takeUntil(stopPolling$)`** — stream polling sống mãi, kể cả khi component đã hủy.
3.  **`retry` không kèm backoff** — retry ngay lập tức dồn vào server đang quá tải là thói quen xấu; luôn thêm khoảng nghỉ tăng dần.
4.  **Quên `visibilitychange`** — polling chạy khi tab ẩn làm server tốn kém vô ích (một app lớn dễ có cả nghìn tab ẩn cùng poll).
5.  **Nhầm `timer(0, n)` với `interval(n)`**: `timer(0, n)` gọi request **ngay lập tức** rồi mới mỗi n ms; `interval(n)` phải chờ n ms mới tick đầu tiên. Khi mở màn, người dùng thường muốn có data ngay — chọn `timer`.

## 📌 Tóm tắt

| Vấn đề | Giải pháp | Operator |
| --- | --- | --- |
| Nhịp cố định, không trôi theo độ trễ response | `timer(0, POLL_INTERVAL)` | Thay vì `setInterval` |
| Request chồng chéo | `switchMap` trên từng tick | `concatMap` nếu không được hủy tick |
| Start/Stop | Tín hiệu điều khiển là stream + `switchMap` tầng ngoài | Không dùng cờ boolean |
| Tab ẩn → dừng | `visibilitychange` điều khiển start/stop stream | |
| Lỗi đơn lẻ | `retry({ delay: backoff + jitter })` | Không giết vòng polling |
| Tắt spinner/dọn dẹp | `finalize` | Chạy dù complete/error/unsubscribe |

## 🧪 Bài tập tự làm

1. **Polling có tần suất động**: nút "Nhanh/Chậm" đổi chu kỳ 1s ↔ 10s mà không chết vòng polling. Gợi ý: `switchMap` tầng ngoài đổi sang `timer(0, newInterval)` mỗi khi nhịp đổi.
2. **Retry có giới hạn rồi degrade**: sau 5 lần backoff thất bại, chuyển state sang "offline mode" (gợi ý: `retry({ count: 5, delay })` + `catchError` trả giá trị đánh dấu), kèm tự động thử lại khi window phát event `online`.
3. **Jitter có kiểm soát**: thay `timer(fixed)` bằng `timer(base + Math.random() * spread)` và đo bằng TestScheduler xem ba client mô phỏng có còn đánh server cùng frame không.

Cả ba bài đều có thể test được với [TestScheduler](../../3_deep_dives/5_testing) mà không chờ thời gian thật — chính là lợi thế kép của pattern này: chạy được và test được.

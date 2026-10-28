# Chương 5: RxJS Real-world Practices

Các kỹ thuật RxJS thực tế, tổng hợp từ **[angular.love](https://angular.love/)** (blog chất lượng cao về Angular & RxJS) và kinh nghiệm làm việc hằng ngày. Mỗi bài thực hành trong thư mục này là một project nhỏ chạy được.

## 🏆 Top 10 kỹ thuật "phải biết"

1.  **Auto-Unsubscribe (Memory Leak Protection)**: pattern `takeUntil(destroy$)` hoặc async pipe để tự hủy subscription khi component bị hủy. *(Chi tiết: [3_deep_dives/2_memory-management](../3_deep_dives/2_memory-management))*
2.  **Type-ahead Search (Autocomplete)**: `debounceTime` + `distinctUntilChanged` + `switchMap` — ô tìm kiếm không spam server.
3.  **API Caching**: `shareReplay({ bufferSize: 1, refCount: true })` để nhiều component cùng subscribe nhưng chỉ gọi API một lần. *(Chi tiết: [1_hot-vs-cold](../3_deep_dives/1_hot-vs-cold))*
4.  **Race Condition Handling**: `switchMap` hủy request cũ khi request mới được gửi (chuyển tab nhanh, filter nhanh).
5.  **Error Handling & Recovery**: `catchError` + `EMPTY`/`of(defaultValue)` giữ stream không chết.
6.  **Loading Spinner State**: `finalize()` tắt spinner bất kể thành công hay thất bại.
7.  **Polling**: `timer` + `switchMap` gọi API định kỳ. *(Chi tiết: [4_patterns/3_polling](../4_patterns/3_polling))*
8.  **Form Value Changes**: `combineLatest` lắng nghe thay đổi của nhiều field cùng lúc.
9.  **Prevent Double Clicks**: `exhaustMap` cho nút submit — chặn click liên tiếp khi request chưa xong.
10. **Global State Management**: `BehaviorSubject` như một Store đơn giản (mini-Redux).

## 🧭 Bản đồ kỹ năng: kỹ thuật nào dùng operator nào?

```
                  ┌────────────────────────────────────────────┐
                  │              THỜI GIAN                     │
                  │  debounceTime / throttleTime / timer       │
                  │  → search-as-you-type, auto-save, polling  │
                  └──────────────────┬─────────────────────────┘
                                     │
   ┌─────────────────────────────────┼─────────────────────────────────┐
   │                                 │                                 │
┌──▼──────────────┐        ┌─────────▼─────────┐            ┌──────────▼─────────┐
│  FLATTENING     │        │     COMBINE       │            │   LIFECYCLE        │
│  switchMap      │        │  combineLatest    │            │  takeUntil         │
│  concatMap      │        │  withLatestFrom   │            │  take(1)/first()   │
│  exhaustMap     │        │  forkJoin         │            │  finalize          │
│  → hủy/xếp hàng │        │  → state ghép nguồn│           │  → dọn dẹp sạch    │
└─────────────────┘        └───────────────────┘            └────────────────────┘
   │                                 │                                 │
┌──▼──────────────┐        ┌─────────▼─────────┐            ┌──────────▼─────────┐
│  MULTICAST      │        │     STATE         │            │     ERROR          │
│  share()        │        │  BehaviorSubject  │            │  catchError        │
│  shareReplay    │        │  scan/mergeScan   │            │  retry({delay})    │
│  → 1 nguồn chung│        │  → store mini     │            │  → luồng không chết│
└─────────────────┘        └───────────────────┘            └────────────────────┘
```

Sáu "trụ cột" trên che phủ ~90% nhu cầu thực tế. Nhóm kỹ thuật dưới đây được sắp theo cùng trật tự.

---

## 🧭 Chỉ dẫn học theo nhóm

### Nhóm I: User Interface & DOM Events

11.  **[Drag and Drop](https://angular.love/?s=drag+and+drop)**: kết hợp `mousedown`, `mousemove`, `mouseup` với `takeUntil` và `switchMap`.
12.  **[Double Click Detection](https://angular.love/?s=double+click+rxjs)**: `buffer`, `throttleTime` và `filter` để phát hiện double click.
13.  **[Window Resize Optimization](https://angular.love/?s=window+resize+rxjs)**: `throttleTime` để giảm số lần tính toán lại layout.
14.  **[Mouse Hover Intent](https://angular.love/?s=hover+intent)**: `delay`/`debounceTime` để phân biệt hover thật với lướt qua.
15.  **[Keyboard Shortcuts](https://angular.love/?s=keyboard+shortcuts)**: `fromEvent(document, 'keyup')` + `filter` bắt tổ hợp phím.
16.  **[Click Outside](https://angular.love/?s=click+outside)**: `fromEvent(document, 'click')`, lọc click ngoài element để đóng dropdown.

### Nhóm II: HTTP & Network Patterns

17.  **[Exponential Backoff Retry](https://angular.love/?s=exponential+backoff)**: `retry({ delay })` — thử lại sau 1s, 2s, 4s, 8s... (chi tiết: [3_polling](../4_patterns/3_polling)).
18.  **Sequential Request Dependency**: gọi API A, lấy kết quả gọi API B (`concatMap` hoặc `switchMap`).
19.  **Parallel Requests**: `forkJoin` — gọi song song 3 API, chờ cả 3 xong mới render.
20.  **Cancel Request on Navigation**: hủy request khi user chuyển trang (`takeUntil` gắn router events).
21.  **Offline Support**: event `online`/`offline` (`fromEvent(window, 'online')`) + retry khi có mạng lại.
22.  **Upload Progress**: lắng nghe sự kiện upload progress, map ra % hiển thị thanh tiến trình.
23.  **Polling theo điều kiện**: chỉ polling khi tab active (`fromEvent(document, 'visibilitychange')`).

### Nhóm III: Dữ liệu & State

24.  **Store + Action Pattern**: mô phỏng Redux với `Subject` (Action) và `scan` (Reducer) — chính là [2_action_reaction](../4_patterns/2_action_reaction).
25.  **Undo/Redo**: lưu lịch sử vào mảng với `scan`, hoàn tác theo yêu cầu.
26.  **Filter List Client-side**: `combineLatest([searchTerm$, listData$])` lọc danh sách real-time.
27.  **Auto-Save**: `debounceTime` sau khi nhập liệu, tự lưu nháp.
28.  **Countdown Timer**: `timer`, `map`, `takeWhile` làm đồng hồ đếm ngược.
29.  **Undo/Redo**: lịch sử trạng thái với `scan` + mảng stack.

### Nhóm IV: Advanced & Performance

30.  **Lazy Loading Observable**: `defer` trì hoãn việc tạo Promise/Observable đến lúc subscribe.
31.  **Custom Operators**: viết operator riêng tái sử dụng (ví dụ `debug()`).
32.  **Batch Processing**: `bufferTime`/`bufferCount` gom 10 log rồi mới gửi server.
33.  **Pause/Resume Stream**: `windowToggle` hoặc `filter` với flag.
34.  **WebSocket Multiplexing**: chia một kết nối socket thành nhiều stream (`webSocket().multiplex()`).

---

## 🧪 Các bài thực hành trong repo này

### Tổng quan

| # | Bài | Kỹ năng trọng tâm | Ref |
| --- | --- | --- | --- |
| 1 | [1_auto_reload_data](./1_auto_reload_data) | Tự tải lại dữ liệu sau X giây + nút refresh thủ công; `timer`, `switchMap`, `takeUntil` | [angular.love](https://angular.love/the-simple-way-to-reload-data-using-rxjs) |
| 2 | [2_infinite_scroll](./2_infinite_scroll) | Tải thêm khi cuộn trang: `throttleTime` + `concatMap` + phân trang; chống tải trùng trang | [angular.love](https://angular.love/?s=infinite+scroll) |
| 3 | [3_websocket_realtime](./3_websocket_realtime) | Realtime với WebSocket: `webSocket`, reconnect tự động, heartbeat, share dữ liệu giữa nhiều thành phần | [rxjs.dev/webSocket](https://rxjs.dev/api/webSocket/webSocket) |

### 1_auto_reload_data — tải lại dữ liệu định kỳ

Ba chế độ kích hoạt cho cùng một luồng dữ liệu: định kỳ (`timer`), thủ công (`Subject` của nút refresh), và cả hai (`merge`). Điểm học được:

- `merge(timer$, refreshClicks$)` — nhiều nguồn, một pipeline.
- `switchMap` — refresh mới hủy request cũ đang chạy.
- `startWith` — phát dữ liệu ngay khi mở trang, không chờ tick đầu tiên.

### 2_infinite_scroll — tải thêm khi cuộn trang

Pipeline "scroll → lọc gần đáy → tải tuần tự → tích lũy" (chi tiết đầy đủ trong bài, kèm bản Node chạy được):

```javascript
scroll$
  .pipe(
    throttleTime(200),                       // tôn trọng nhịp cuộn
    filter(() => nearBottom() && !loading),  // chỉ tải khi cần
    concatMap(() => fetchPage(page++)),      // tuần tự, không trùng
    takeWhile(({ isLast }) => !isLast, true),// hết data → tự dừng
    scan((all, { items }) => [...all, ...items], [])
  )
  .subscribe(render);
```

Điểm học được: vì sao `concatMap` (thứ tự) chứ không phải `mergeMap` (song song) hay `switchMap` (hủy giữa chừng) — một quyết định operator thay đổi cả tính đúng đắn của dữ liệu.

### 3_websocket_realtime — kết nối thời gian thực

`webSocket()` của RxJS là một Subject hai chiều. Bốn mảnh ghép bắt buộc cho production:

1. `retry({ delay: backoff })` — reconnect tự động khi đứt.
2. `share()` — một kết nối, nhiều consumer; refCount tự đóng khi không ai nghe.
3. Heartbeat (`timer` + `next({type:'ping'})`) — giữ kết nối không bị gateway ngắt.
4. `multiplex()` — chia một socket thành nhiều kênh logic độc lập.

## 📚 Kho kỹ thuật mở rộng (kế hoạch triển khai)

Các bài dưới đây là **kế hoạch mở rộng** (chưa có code trong repo — mỗi dòng là một đề bài đủ rõ để tự triển khai):

| # | Bài dự kiến | Operator gợi ý | Ghi chú |
| --- | --- | --- | --- |
| 4 | Type-ahead Search | `debounceTime` + `distinctUntilChanged` + `switchMap` | Xem mục 2 Top-10 |
| 5 | Global State | `BehaviorSubject` + `scan` | Xem [4_patterns/1_state-management](../4_patterns/1_state-management) |
| 6 | Drag & Drop | `fromEvent(mousedown/move/up)` + `switchMap` + `takeUntil` | Bản drag thuần RxJS ~20 dòng |
| 7 | Exponential Retry | `retry({ delay })` với backoff | Xem [4_patterns/3_polling](../4_patterns/3_polling) |
| 8 | Cache Request | `shareReplay({ bufferSize: 1, refCount: true })` | Xem [3_deep_dives/1_hot-vs-cold](../3_deep_dives/1_hot-vs-cold) |
| 9 | Stopwatch | `interval`, `scan`, `startWith`, `switchMap` | Bài tập scan kinh điển |
| 10 | Click Outside | `fromEvent(document, 'click')` + `filter` | Cẩn thận: loại trừ chính element |
| 11 | Form Auto-save | `debounceTime` + `mergeMap` | mergeMap để không hủy lần save trước |
| 12 | Upload Progress | `ajax` với `progress` events | Tách stream % ra khỏi stream kết quả |
| 13 | Chat Polling | `timer` + `switchMap` | Bước đệm trước khi chuyển sang WebSocket |
| 14 | Undo/Redo | `scan` + mảng stack | Cặp push/pop trong reducer |
| 15 | Double Click Detection | `buffer` + `throttleTime` | Đếm click trong cửa sổ 250ms |
| 16 | Countdown Timer | `timer`, `map`, `takeWhile` | Tính toán thời gian còn lại, đừng cộng trừ tick |
| 17 | Batch Logging | `bufferTime(1000, null, 10)` | Gửi khi đủ 10 log hoặc mỗi 1s |
| 18 | Offline Queue | `fromEvent(window, 'online')` + `concatMap` | Xếp hàng gửi khi có mạng lại |

## Quy tắc thực hành

Mỗi bài là một thư mục độc lập với cấu trúc:

```
N_tên_bài/
├── README.md        # bài học: vấn đề, kiến trúc, code giải thích
└── (src/, package.json...)  # project chạy được nếu có
```

- Chạy được bằng `npm install && npm start` (hoặc `npx ts-node src/index.ts` cho ví dụ thuần Node).
- Mọi ví dụ dùng **RxJS 7.8.2** (bản stable `latest` — xem bảng phiên bản ở [README gốc](../README.md)).
- Import một entry duy nhất: `import { ... } from 'rxjs'` (trừ `TestScheduler` từ `'rxjs/testing'`, `webSocket` từ `'rxjs/webSocket'`).
- Mỗi bài kết thúc bằng mục "cạm bẫy" và bảng tóm tắt operator — đọc mục này ngay cả khi không gõ code.

## ✅ Kiểm tra tự đánh giá sau chương này

Bạn có thể trả lời nhanh các câu sau không?

1. Vì sao dùng `switchMap` cho search nhưng `concatMap` cho upload? (mới nhất thắng vs. thứ tự + không hủy)
2. `shareReplay({ bufferSize: 1, refCount: true })` khác `shareReplay(1)` ở điểm nào, và vì sao dạng số đã deprecated? (refCount tường minh)
3. Khi tab bị ẩn, làm sao cho polling tự dừng mà không tốn một dòng check trong handler? (stream `visibilitychange` làm tín hiệu điều khiển)
4. Điểm khác nhau giữa `finalize` và `catchError` khi request fail? (`finalize` chỉ dọn dẹp, không thay đổi kết quả; `catchError` thay luồng)
5. Infinite scroll: vì sao dùng `concatMap` thay vì `mergeMap`? (đúng thứ tự trang, không chồng chéo)

Nếu lúng túng câu nào, quay lại bài tương ứng được link ở trên.

## 🗂 Lộ trình xây dựng một app nhỏ từ các kỹ thuật này

Gợi ý một dự án "tin nhắn nhóm" dùng lại toàn bộ chương (đây là cách tốt để gắn kết kiến thức):

```
Bước 1 — State (kỹ thuật #10)
  AuthStore với BehaviorSubject: { user, token }

Bước 2 — Data fetching (kỹ thuật #2, #3, #4, #6)
  Danh sách phòng chat: shareReplay cache + switchMap hủy khi đổi phòng

Bước 3 — Realtime (bài 3_websocket_realtime)
  webSocket + retry backoff + share + multiplex theo phòng

Bước 4 — Sự kiện người dùng (kỹ thuật #2, #9)
  Ô soạn tin: debounceTime 300ms; nút gửi: exhaustMap chống double-click

Bước 5 — Polling fallback (bài 4_patterns/3_polling)
  Khi WebSocket chết quá 5 lần: chuyển sang polling 10s, quay lại socket khi mạng ổn định

Bước 6 — Dọn dẹp (kỹ thuật #1, #6)
  takeUntil(destroy$) cho mọi subscription sống theo component; finalize cho spinner
```

Mỗi bước là một commit logic — làm đủ 6 bước là bạn đã đi hết toàn bộ tài liệu này trong một sản phẩm thật.

---

*Cập nhật lần cuối: 10/2026. Nguồn tổng hợp: [angular.love](https://angular.love/), [rxjs.dev](https://rxjs.dev), repo [ReactiveX/rxjs](https://github.com/ReactiveX/rxjs).*

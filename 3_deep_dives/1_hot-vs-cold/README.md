# Hot vs Cold Observables

## Giá trị cốt lõi

Hiểu về **Producer location** — nơi dữ liệu được sinh ra. Đây là khái niệm gây ra nhiều bug thực tế nhất của RxJS: **request bị lặp lại**, **giá trị khác nhau giữa các subscriber**, **bỏ lỡ dữ liệu emit trước khi subscribe**.

> Tài liệu gốc: <https://rxjs.dev/guide/observable> và bài viết của Ben Lesh: [Hot vs Cold Observables](https://medium.com/@benlesh/hot-vs-cold-observables-f8094ed53339).

---

## 1. Cold Observable (Unicast)

- **Producer được tạo BÊN TRONG Observable.** Mỗi khi có người subscribe, một producer mới được tạo và chạy lại từ đầu.
- Mỗi Subscriber có một **luồng chạy riêng biệt**.
- Ví dụ đời thường: xem phim trên **Netflix** — bạn bấm play lúc nào thì phim chạy từ đầu cho **riêng bạn**.

```javascript
// Mỗi subscriber nhận một dãy số RIÊNG
import { Observable } from 'rxjs';

const cold$ = new Observable((obs) => {
  obs.next(Math.random());
});

cold$.subscribe((v) => console.log('A:', v)); // 0.123
cold$.subscribe((v) => console.log('B:', v)); // 0.456 — khác nhau!
```

### Các nguồn cold phổ biến

| Nguồn | Hành vi khi subscribe lần 2 |
| --- | --- |
| `of(...)`, `from(...)` | Emit lại toàn bộ giá trị từ đầu (đồng bộ) |
| `interval(n)`, `timer(n)` | Bắt đầu đếm lại từ 0 |
| `ajax.getJSON(url)`, `from(fetch(...))` | **Gửi lại HTTP request** — đây là bẫy kinh điển |
| `fromEvent`? → KHÔNG, xem bảng hot bên dưới | — |

Hệ quả thực tế:

```javascript
// ❌ 3 component cùng subscribe → 3 request trùng lặp tới server
const user$ = ajax.getJSON('/api/user/1');
user$.subscribe((u) => renderSidebar(u));
user$.subscribe((u) => renderHeader(u));
user$.subscribe((u) => renderProfile(u));
```

---

## 2. Hot Observable (Multicast)

- **Producer nằm BÊN NGOÀI Observable**, tồn tại độc lập với việc có ai subscribe hay không.
- Dữ liệu được **chia sẻ** cho tất cả subscriber hiện tại; ai vào muộn thì bỏ lỡ phần đã phát.
- Ví dụ đời thường: xem **livestream** — vào muộn thì xem từ giữa, không tua lại được.

```javascript
// Producer sinh giá trị TRƯỚC khi subscriber nào tồn tại
const random = Math.random();
const hot$ = new Observable((obs) => {
  obs.next(random);
});
hot$.subscribe((v) => console.log('A:', v)); // 0.789
hot$.subscribe((v) => console.log('B:', v)); // 0.789 — GIỐNG nhau
```

### Các nguồn hot phổ biến

| Nguồn | Vì sao hot |
| --- | --- |
| `fromEvent(el, 'click')` | Sự kiện DOM có sẵn, không phụ thuộc subscriber |
| `Subject` (mọi biến thể) | Chủ động `next()` từ bên ngoài; subscribe vào giữa luồng |
| WebSocket đang mở, tin nhắn server | Sự kiện đến bất kể ai đang nghe |
| Sự kiện chuột/bàn phím, `document.visibilitychange` | Sự kiện hệ thống |

---

## 3. Bảng tổng kết Cold vs Hot

| Tiêu chí | Cold | Hot |
| --- | --- | --- |
| Producer nằm ở đâu | Bên trong Observable | Bên ngoài Observable |
| Kiểu phân phối | Unicast (mỗi người một luồng) | Multicast (dùng chung) |
| Subscribe muộn | Chạy lại từ đầu | Bỏ lỡ phần đã phát |
| Subscribe 2 lần | Producer chạy lại 2 lần | Không lặp lại producer |
| Ví dụ đời thường | Netflix | Livestream |
| Nguồn điển hình | `of`, `from`, `interval`, `ajax` | `fromEvent`, `Subject` |
| Rủi ro điển hình | Request lặp, tốn tài nguyên | Bỏ lỡ giá trị đầu, state lệch |

---

## 4. Biến Cold thành Hot: share() và shareReplay()

Không cần viết tay Subject. RxJS cung cấp hai operator multicasting chuẩn.

### 4.1. share()

`share()` = multicast bằng một Subject ẩn. **Không cache giá trị** — người vào muộn giữa chừng chỉ nhận những gì phát sau đó, và nếu stream đã complete/error thì subscriber mới nhận ngay complete/error (không resubscribe source).

```javascript
import { ajax } from 'rxjs/ajax';
import { share } from 'rxjs';

const user$ = ajax.getJSON('/api/user/1').pipe(share());

user$.subscribe((a) => console.log('A:', a)); // request 1
user$.subscribe((b) => console.log('B:', b)); // dùng chung — không request mới
```

Hành vi mặc định của `share()` (RxJS 7): refCount = true (hủy nguồn khi subscriber cuối rời đi), resetOnRefCountZero = true (subscribe lại sau đó sẽ chạy source từ đầu).

### 4.2. shareReplay({ bufferSize, refCount })

`shareReplay()` = multicast **kèm cache** `bufferSize` giá trị cuối. Subscriber mới nhận ngay các giá trị đã cache mà không cần chờ emit tiếp.

```javascript
import { ajax } from 'rxjs/ajax';
import { shareReplay } from 'rxjs';

// Cache 1 giá trị cuối + tự ngắt nguồn khi không còn ai nghe
const userShared$ = ajax.getJSON('/api/user/1').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

userShared$.subscribe((a) => console.log('A:', a)); // request 1
userShared$.subscribe((b) => console.log('B:', b)); // dùng cache — KHÔNG request
```

| Tham số | Ý nghĩa | Khuyến nghị |
| --- | --- | --- |
| `bufferSize` | Số giá trị cuối được phát lại cho subscriber mới | API trả về 1 object → `bufferSize: 1` |
| `refCount` | `true` = khi subscriber cuối unsubscribe, hủy nguồn; `false` = nguồn **chạy mãi, cache giữ mãi** | Cache HTTP request → `true`; cache config/login cần tồn tại suốt app → `false` |
| `resetOnError` | Cache có bị xóa khi source error không (mặc định: **có** — cache bị xóa khi lỗi) | Giữ mặc định để một lỗi không "ôm" cache vĩnh viễn |
| `resetOnComplete` | Cache có bị xóa khi source complete không | Cache request thường để mặc định (giữ) |
| `resetOnRefCountZero` | Khi refCount về 0 có xóa cache ngay không | Mặc định true; muốn giữ cache trong khoảng thời gian ngắn → `resetOnRefCountZero: false` |

### 4.3. share() vs shareReplay() — chọn cái nào?

| Tiêu chí | `share()` | `shareReplay({bufferSize:1, refCount:true})` |
| --- | --- | --- |
| Subscriber mới giữa chừng | Chỉ nhận giá trị phát sau đó | Nhận ngay giá trị cuối (cache) |
| Subscribe sau khi complete | Nhận complete luôn (không chạy lại) | Nhận lại giá trị đã cache rồi complete |
| Dùng cho | Sự kiện realtime (click, tick giá) | HTTP GET, dữ liệu cần "lấy ngay khi subscribe" |
| Nguy cơ | Vào muộn → bỏ trống UI | Quên refCount → cache + nguồn giữ mãi (bỏ mục 5) |

> Cú pháp `shareReplay(1)` (truyền số) vẫn hoạt động nhưng đã **deprecated từ RxJS 7** — hãy dùng dạng object `{ bufferSize: 1, refCount: true }`.

---

## 5. Pitfall: shareReplay mà quên refCount

Đây là một trong những bug "ngấm chậm" phổ biến nhất. Hãy so sánh:

```javascript
// ❌ refCount: false (mặc định nếu truyền số, hoặc không khai báo)
const cachedUser$ = ajax.getJSON('/api/user/1').pipe(
  shareReplay({ bufferSize: 1 }) // refCount mặc định = false
);

// Lần đầu: request + cache
cachedUser$.subscribe(render); // request 1

// Component unmount, nhưng nguồn vẫn chạy ngầm đến khi complete.
// Cache và Subject được giữ MÃI MÃI trong bộ nhớ.
// 10 phút sau, data user cũ vẫn được trả ra — dù server đã đổi.
cachedUser$.subscribe(render); // không request — nhưng cũng KHÔNG refresh bao giờ
```

Vấn đề của `refCount: false`:

1. **Memory leak tiềm ẩn**: nguồn (ví dụ `interval` đằng sau) và cache tồn tại ngay cả khi không còn ai nghe.
2. **Dữ liệu "ôm"**: cache không bao giờ tự làm mới — bạn vô tình tạo ra một state bất tử.
3. **Khó debug**: mọi component mới đều nhận data cũ mà không có lỗi nào được báo.

```javascript
// ✅ refCount: true — rời đi là ngắt, vào lại là fetch mới nếu cache bị xóa
const cachedUser$ = ajax.getJSON('/api/user/1').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

> **Ngược lại**, có một trường hợp cố ý dùng `refCount: false`: cache dữ liệu "không bao giờ đổi" trong suốt vòng đời app (ví dụ: cấu hình app, danh sách quốc gia). Khi đó cache vĩnh viễn chính là mục tiêu.

---

## 6. Pitfall thứ hai: Subject bị error làm "chết"

Hot source dựa trên Subject có một đặc điểm nguy hiểm: khi source gốc bắn `error`, Subject cũng error, và **mọi subscriber sau đó nhận error ngay lập tức** — stream không thể phục hồi:

```javascript
import { Subject, throwError } from 'rxjs';
import { catchError, of, share } from 'rxjs';

const source$ = throwError(() => new Error('boom')).pipe(share());

source$.subscribe({ error: (e) => console.log('A:', e.message) }); // "boom"
source$.subscribe({ error: (e) => console.log('B:', e.message) }); // "boom" — không resubscribe
```

Cách phòng: đặt `catchError` **TRƯỚC** `share()` để lỗi không chạm vào Subject:

```javascript
const safe$ = ajax.getJSON('/api/user/1').pipe(
  catchError(() => of(null)), // lỗi → fallback, share vẫn sống
  share()
);
```

---

## 7. Tóm tắt quyết định

1. Mỗi subscriber cần chạy producer riêng (form value, timer riêng)? → **giữ cold**.
2. Nhiều nơi cùng dùng một HTTP GET? → `shareReplay({ bufferSize: 1, refCount: true })`.
3. Sự kiện realtime nhiều người nghe, không cần giá trị cũ? → `share()`.
4. Data config dùng suốt app? → `shareReplay({ bufferSize: 1, refCount: false })` — cố ý.
5. Cần "những người vào muộn vẫn có data ngay"? → `shareReplay`.
6. Không chắc? Log số request/emit bằng `tap` — đếm là biết cold hay hot.

---

## 8. Kiểm chứng bằng tay (thí nghiệm 2 phút)

Đừng tin lời nào — tự chạy và đếm. File dưới đây chạy được bằng `npx ts-node`:

```typescript
import { interval, Subject, of } from 'rxjs';
import { share, shareReplay, take, tap } from 'rxjs';

// ── Thí nghiệm 1: interval là COLD ──────────────────────────────
let emitCount = 0;
const coldTimer$ = interval(100).pipe(
  tap(() => emitCount++),
  take(3)
);
coldTimer$.subscribe(() => {});
coldTimer$.subscribe(() => {});
setTimeout(() => console.log('cold: hai subscriber → tổng emit =', emitCount), 400);
// Kết quả: 6 (mỗi subscriber một chuỗi 3 tick riêng)

// ── Thí nghiệm 2: share() biến thành HOT ────────────────────────
let emitCount2 = 0;
const hotTimer$ = interval(100).pipe(
  tap(() => emitCount2++),
  take(3),
  share()
);
hotTimer$.subscribe(() => {});
hotTimer$.subscribe(() => {});
setTimeout(() => console.log('hot: hai subscriber → tổng emit =', emitCount2), 400);
// Kết quả: 3 (một chuỗi duy nhất được chia sẻ)
```

Cùng một `interval`, khác biệt chỉ là `share()` — và tổng số emit giảm một nửa. Đó chính là toàn bộ bài học hot/cold: **ai giữ producer, thì producer chạy cho ai.**

## 9. Các tình huống thực tế

| Tình huống | Cold hay Hot? | Giải pháp |
| --- | --- | --- |
| 3 component cùng render user từ 1 API | Cold — 3 request | `shareReplay({ bufferSize: 1, refCount: true })` |
| Ô search gợi ý cho nhiều dropdown | Cold — lặp request | `shareReplay` trên stream kết quả |
| Nút "thanh toán" bấm nhiều lần | Cold — nhiều request | Xử lý ở tầng event (xem [7_higher-order-observable](../../2_operators/7_higher-order-observable)) |
| Đồng hồ hiển thị giờ ở 5 widget | Cold — 5 interval riêng (lãng phí nhẹ) | `interval(1000).pipe(share())` |
| Chân dung trạng thái login | Hot — Subject phát khi login/logout | `BehaviorSubject` (mặc định hot) |
| Sự kiện click toàn cục | Hot sẵn (`fromEvent`) | Không cần thêm gì |

## 10. Liên quan trực tiếp: memory management

Hot source không tự hủy khi subscriber rời đi — nó cứ phát. Vì vậy với stream sống lâu (socket, interval chia sẻ), việc hủy theo vòng đời component là **bắt buộc**, không phải tùy chọn:

```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs';

class Widget {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    sharedSocket$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => this.render(msg));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

Chi tiết các chiến lược hủy nằm ở [2_memory-management](../2_memory-management). Ghi nhớ cặp đôi: **hot = chia sẻ = phải tự quản hủy**; cold = tự chết khi complete nhưng có thể chạy lại tốn kém.

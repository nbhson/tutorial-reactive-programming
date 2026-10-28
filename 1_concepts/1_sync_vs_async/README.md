# Sync vs Async — và sự tiến hóa tới Stream

## Giá trị cốt lõi

Hiểu được giới hạn của `Promise` và tại sao chúng ta cần `Observable` để xử lý các sự kiện **đa giá trị theo thời gian** (multi-value over time).

Thang bậc tiến hóa của việc xử lý bất đồng bộ trong JavaScript:

```
Callback → Promise → Observable
```

---

## 1. Callback (Quá khứ)

Cách nguyên thủy: đưa cho hàm bất đồng bộ một hàm gọi lại.

```javascript
getUser(id, (err, user) => {
  if (err) return console.error(err);
  getOrders(user.id, (err, orders) => {
    if (err) return console.error(err);
    getDelivery(orders[0].id, (err, delivery) => {
      // Callback Hell: lồng sâu, khó đọc, khó xử lý lỗi tập trung
      console.log(delivery);
    });
  });
});
```

Vấn đề:
- **Callback Hell**: logic nối tiếp biến thành kim tự tháp lồng nhau.
- **Không có cơ chế lỗi tập trung**: mỗi tầng phải tự `if (err)`.
- **Không hủy được**: một khi đã gọi, bạn không có cách nào "rút lui".
- **Không compose được**: không có cách chuẩn để gộp, so sánh, throttle các callback.

## 2. Promise (Hiện tại — cho giá trị đơn)

`Promise` giải quyết callback hell bằng cách "đóng gói" giá trị tương lai:

```javascript
const promise = fetch('/api/user/1').then((r) => r.json());
```

Ưu điểm: chuỗi `then/catch`, dễ đọc, có thể `async/await`.

Nhưng có một giới hạn mang tính kiến trúc: **Promise chỉ resolve MỘT lần duy nhất.**

```javascript
// Promise chỉ trả về 1 giá trị rồi "đóng"
const promise = new Promise((resolve) => {
  setTimeout(() => resolve('Hello'), 1000);
  setTimeout(() => resolve('World'), 2000); // Bị lờ đi!
});
promise.then(console.log); // chỉ in ra "Hello"
```

Xem ví dụ chi tiết trong [1_promise_limitations](./1_promise_limitations).

### Tự điểm lại bốn giới hạn của Promise

1. **Chỉ một giá trị** — không thể mô tả luồng sự kiện liên tục.
2. **Không hủy được** — `fetch` đã đi là đi; bạn có thể bỏ qua kết quả nhưng request vẫn chạy.
3. **Không lười (eager)** — promise bắt đầu chạy ngay khi được tạo, không phải khi "được dùng".
4. **Không có cơ chế subscribe nhiều lần** — `.then` mỗi chỗ là một chuỗi logic rời rạc, không share được execution.

> Vì sao giới hạn số 3 quan trọng? Trong Reactive, việc "khai báo trước, chạy khi subscribe" cho phép RxJS hủy, retry, resubscribe — cả Promise không có những cơ chế này.

### Vấn đề kinh điển: "racing" nhiều promise

Khi cần **kết quả của nguồn nhanh nhất** hoặc **tất cả kết quả song song**, Promise có `Promise.race`/`Promise.all` — nhưng chỉ cho các tập hợp **tĩnh**, biết trước khi chạy:

```javascript
// OK cho số nguồn cố định — nhưng nguồn không cố định thì sao?
await Promise.all([fetchUser(), fetchOrders()]);
```

Khi số nguồn **thay đổi theo thời gian** (mỗi click tạo một fetch mới), Promise phải được viết lại thủ công mỗi lần — trong khi RxJS chỉ cần đổi operator: `mergeMap` (song song), `switchMap` (hủy cái cũ), `concatMap` (xếp hàng). Đây là chỗ "dữ liệu đa giá trị" trở thành yêu cầu thật chứ không phải lý thuyết.

## 3. Observable (Tương lai — cho Multi Value)

Thực tế, dữ liệu thường đến theo **luồng liên tục**:

- Người dùng click chuột (nhiều lần, không biết trước).
- WebSocket gửi tin nhắn (nhiều lần).
- Bộ đếm thời gian, vị trí GPS, giá cổ phiếu (liên tục).

`Promise` không thể mô tả những thứ này một cách tự nhiên. `Observable` ra đời để lấp chỗ trống:

```javascript
import { interval, take } from 'rxjs';

interval(1000)
  .pipe(take(3)) // nhận 0, 1, 2 — ba giá trị, rồi complete
  .subscribe((v) => console.log(v));
// 0 (sau 1s), 1 (sau 2s), 2 (sau 3s) — rời tay, không cần clearInterval
```

### Những nguồn đa giá trị thường gặp trong app thật

| Nguồn | Đặc điểm | Promise xử lý được? |
| --- | --- | --- |
| Click / keyboard / scroll | Số lần không biết trước | ❌ |
| WebSocket / server-sent events | Liên tục suốt phiên | ❌ |
| `setInterval` / đồng hồ | Liên tục theo nhịp | ❌ |
| Vị trí GPS (`watchPosition`) | Liên tục khi di chuyển | ❌ |
| Trạng thái drag (mousemove) | Liên tục trong lúc kéo | ❌ |
| Một lần fetch dữ liệu | Giá trị duy nhất | ✅ — và nên dùng Promise |

Quy tắc: **nguồn đa giá trị → Observable; nguồn đơn giá trị → Promise.** Đừng buộc Observable vào chỗ Promise làm tốt hơn.

### So sánh Promise vs Observable

| Tiêu chí | Promise | Observable |
| --- | --- | --- |
| Số giá trị | 1 | 0 → nhiều |
| Bắt đầu chạy | Ngay khi tạo (eager) | Khi `subscribe` (lazy) |
| Hủy | Không thể | `unsubscribe()` |
| Cơ chế lỗi | `catch` | `error` callback / `catchError` |
| Chạy lại | Không (đã resolve thì xong) | Mỗi subscribe chạy lại (cold) hoặc chia sẻ (hot) |
| Có idle không? | Không — hoặc pending hoặc settled | Có — có thể không phát gì trong thời gian dài |

### Chuyển đổi hai chiều

Hai thế giới có thể trao đổi với nhau — và bạn sẽ dùng điều này hằng ngày:

```javascript
import { from, of } from 'rxjs';

// Promise → Observable: có thể hủy, có thể pipe, có thể retry
from(fetch('/api/user/1')).subscribe((res) => console.log(res.status));

// Observable → Promise: chỉ lấy "kết quả đầu" hoặc "kết quả cuối"
```

RxJS 7 thay `toPromise()` (deprecated) bằng hai hàm tường minh:

```javascript
import { firstValueFrom, lastValueFrom } from 'rxjs';

const first = await firstValueFrom(of(1, 2, 3)); // 1
const last = await lastValueFrom(of(1, 2, 3));   // 3
```

## 5. Bức tranh tổng thể: bốn cách nhận giá trị

> **Tổng kết:**
>
> | Cách | Số giá trị | Đồng bộ? | Cơ chế |
> | --- | --- | --- | --- |
> | Function | 1 | Đồng bộ | Gọi trực tiếp |
> | Iterator/Generator | Nhiều | Đồng bộ | Pull (bạn xin từng giá trị) |
> | Promise | 1 | Bất đồng bộ | Push (đẩy khi resolve) |
> | **Observable** | **Nhiều** | **Bất đồng bộ** | **Push (đẩy khi có sự kiện)** |

Observable khái quát **cả bốn**: nó là "Array theo thời gian" — nơi giá trị đến dần dần thay vì có sẵn.

## 6. Ví dụ tổng hợp: một bài toán, ba thế hệ giải pháp

Bài toán: tải dữ liệu user, sau đó tải đơn hàng của user đó, rồi hiển thị. Có timeout và lỗi phải xử lý được.

```javascript
// Thế hệ 1: Callback
getUser(id, (err, user) => {
  if (err) return show('Lỗi tải user');
  getOrders(user.id, (err2, orders) => {
    if (err2) return show('Lỗi tải đơn hàng');
    render(user, orders);
  });
});
// Lỗi xử lý thủ công ở mỗi tầng; không hủy được; không compose được.
```

```javascript
// Thế hệ 2: Promise + async/await
try {
  const user = await getUser(id);
  const orders = await getOrders(user.id);
  render(user, orders);
} catch (err) {
  show('Có lỗi xảy ra'); // nhưng KHÔNG biết hủy khi user rời trang
}
// Điểm yếu: await không hủy được. Người dùng bấm "quay lại"
// thì request vẫn chạy ngầm, và kết quả về cũng bị bỏ.
```

```javascript
// Thế hệ 3: Observable
import { from } from 'rxjs';
import { switchMap, map, takeUntil, catchError, of } from 'rxjs';

const load$ = from(getUser(id)).pipe(
  switchMap((user) =>
    from(getOrders(user.id)).pipe(map((orders) => ({ user, orders })))
  ),
  catchError(() => of(null)),
  takeUntil(destroy$) // user rời trang → tự hủy chuỗi request
);

load$.subscribe((data) => data ? render(data.user, data.orders) : showError());
```

Ba thế hệ, một bài toán. Điểm khác biệt không phải "viết ít hơn" — mà là **khả năng**: chỉ Observable cho phép hủy giữa chừng (`takeUntil`), ghép chiến lược hủy với biến đổi (`switchMap`), và gom lỗi về một chỗ mà không chết luồng.

## 7. Khi nào dùng gì?

- **Một hành động một lần, cần `await`**: `Promise` (hoặc `firstValueFrom`).
- **Luồng sự kiện liên tục cần biến đổi/lọc/gộp/hủy**: `Observable`.
- Đừng dùng Observable cho mọi thứ — nếu một giá trị resolve rồi là xong, Promise đơn giản hơn và đó là lựa chọn đúng.

## 8. Câu hỏi tự kiểm tra

Trước khi sang bài sau, hãy tự trả lời:

1. Vì sao `resolve` lần hai bị lờ đi? (đáp: Promise settled một lần duy nhất)
2. Một request `fetch` khi bạn bỏ qua kết quả — nó dừng thật chưa? (đáp: chưa; Promise không hủy được, chỉ là bạn không nghe nữa)
3. `interval(1000).subscribe(...)` rồi component hủy — phải làm gì để không leak? (đáp: giữ `Subscription` và `unsubscribe()`, hoặc dùng `takeUntil`)

Bài sau: [2_pull_vs_push](../2_pull_vs_push) — cơ chế Pull/Push nằm dưới tất cả những điều trên.

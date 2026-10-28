# Pull vs Push

## Giá trị cốt lõi

Phân biệt hai cơ chế chuyển giao dữ liệu: **Pull** (người tiêu thụ kéo) và **Push** (người sản xuất đẩy). Đây là nền tảng lý thuyết của toàn bộ RxJS — hiểu xong bài này, Observer Pattern và Observable sẽ không còn gì bí ẩn.

---

## 1. Pull (Kéo) — The Iterator Pattern

**Người tiêu thụ (Consumer) quyết định khi nào lấy dữ liệu** từ người sản xuất (Producer). Producer không tự làm gì cho đến khi được hỏi.

- **Bạn**: chủ động gọi `getData()`.
- **Producer**: trả về dữ liệu khi được hỏi.
- **Ví dụ**: Function call (bạn gọi hàm, hàm trả về một giá trị), Generator (`function*`).

```javascript
// Function: pull một giá trị
function getData() {
  return 42;
}
const value = getData(); // bạn quyết định LÚC NÀO lấy

// Generator: pull NHIỀU giá trị, từng giá trị một
function* counter() {
  yield 1;
  yield 2;
  yield 3;
}

const iterator = counter();
iterator.next(); // { value: 1, done: false } — bạn xin thì nó mới cho
iterator.next(); // { value: 2, done: false }
iterator.next(); // { value: 3, done: false }
iterator.next(); // { value: undefined, done: true } — hết hàng
```

Đặc điểm nhận dạng của Pull: **mã của bạn đi xin dữ liệu, và nó biết khi nào xin.** Consumer kiểm soát nhịp độ — muốn đọc nhanh chậm cũng được, dừng lại cũng được.

Xem ví dụ chi tiết trong [1_iterator](./1_iterator).

## 2. Push (Đẩy) — The Observer Pattern

**Người sản xuất (Producer) quyết định khi nào gửi dữ liệu** cho người tiêu thụ. Consumer không kiểm soát được thời điểm — nó chỉ **đăng ký** để sẵn sàng nhận.

- **Producer**: bắn sự kiện khi dữ liệu xuất hiện.
- **Bạn**: "đăng ký" (subscribe) để lắng nghe.
- **Ví dụ**: DOM Events, WebSocket, `Promise.then`, RxJS Observable.

```javascript
// DOM event: bạn ngồi chờ, Producer tự đẩy sự kiện tới (không bao giờ biết trước)
document.addEventListener('click', () => console.log('Clicked!'));

// Promise: producer đẩy kết quả khi xong
fetch('/api/data').then((res) => console.log('data tới rồi'));

// RxJS Observable: đẩy NHIỀU giá trị, đúng lúc chúng xuất hiện
import { interval } from 'rxjs';
interval(1000).subscribe((n) => console.log('tick', n));
```

Đặc điểm nhận dạng của Push: **mã của bạn khai báo "khi có dữ liệu thì làm gì", rồi rời tay.** Producer kiểm soát nhịp độ — dữ liệu đến bao nhiêu, lúc nào, do producer.

Xem ví dụ chi tiết trong [2_observer](./2_observer).

## 3. So sánh trực diện

| Tiêu chí | Pull (Iterator) | Push (Observable) |
| --- | --- | --- |
| Ai quyết định khi nào lấy dữ liệu | Consumer (bạn gọi `next()`) | Producer (gọi `next()` của observer) |
| Consumer biết gì khi chờ | Biết có/nhờn giá trị kế tiếp | Không biết bao giờ có, có hay không |
| Xử lý "không có dữ liệu" | `done: true` | `complete()` / không bao giờ |
| Xử lý lỗi | `throw` tại chỗ đọc | Callback `error` được đẩy tới |
| Ví dụ đời thường | Đến quầy hỏi "còn hàng không?" | Cửa hàng gọi điện báo "hàng về rồi!" |

Chú ý dòng cuối cùng của bảng lỗi: cả hai thế giới đều có kênh báo lỗi — nhưng trong Pull, lỗi ném ra tại chỗ bạn đang đọc; trong Push, lỗi được **đẩy tới** nơi đăng ký. Đó là lý do RxJS có callback `error` trong Observer.

## 4. RxJS là thư viện Push-based — nhưng có sức mạnh của cả hai

RxJS được xây dựng hoàn toàn trên Push: producer đẩy `next`/`error`/`complete` tới observer. Nhưng điểm đặc biệt là Observable **giữ được tính lười của Pull**:

```javascript
import { of, map } from 'rxjs';

// KHÔNG có gì chạy cả — chỉ là "khai báo"
const stream$ = of(1, 2, 3).pipe(map((x) => x * 10));

// ...cho đến khi bạn subscribe: producer mới bắt đầu đẩy
stream$.subscribe((v) => console.log(v)); // 10, 20, 30
```

Bảng đối chiếu đầy đủ (lấy từ tư liệu chính thức của RxJS — "Pull vs Push"):

| | Function | Iterator | Promise | Observable |
| --- | --- | --- | --- | --- |
| Số giá trị | 1 | Nhiều | 1 | Nhiều |
| Đồng bộ/Bất đồng bộ | Sync | Sync | Async | Async |
| Pull/Push | Pull | Pull | Push | Push |

Observable = **nhiều giá trị (như Array/Iterator) + bất đồng bộ (như Promise) + push (như event)**.

## 5. Vì sao Push quan trọng trong thực tế?

Vì phần lớn dữ liệu của một app hiện đại **bạn không kiểm soát được thời điểm**:

- Người dùng bấm nút lúc nào? Không ai biết.
- Server gửi tin nhắn lúc nào? Không ai biết.
- Request trả về lúc nào? Không chắc chắn.

Với dữ liệu loại này, mô hình Pull (bạn đi hỏi liên tục "có gì mới chưa?") vừa lãng phí vừa trễ. Mô hình Push (bạn đăng ký một lần, sự kiện tự đến) là cách tự nhiên duy nhất — và Observable là phép **toán học trên dữ liệu push**: lọc, biến đổi, gộp, hủy... như với Array đồng bộ.

```javascript
// Array đồng bộ: bạn gọi phương thức trên dữ liệu có sẵn
[1, 2, 3, 4].filter((n) => n % 2 === 0).map((n) => n * 10); // [20, 40]

// Observable: CÙNG các phép biến đổi, nhưng trên dữ liệu chưa tồn tại,
// sẽ đến theo thời gian — push
import { fromEvent } from 'rxjs';
fromEvent(document, 'click')
  .pipe(
    filter((_, i) => i % 2 === 0), // click chẵn
    map((_, i) => i)               // đánh số thứ tự
  )
  .subscribe((i) => console.log('click thứ', i));
```

## 6. Khi hai thế giới gặp nhau: một ví dụ có cả Pull lẫn Push

Một app thật luôn trộn cả hai. Ví dụ tính tổng giỏ hàng:

```javascript
// PUSH: các thay đổi giỏ hàng đến lúc nào không biết
const cartChanges$ = new Subject<Item[]>(); // server / UI đẩy vào

// PULL + PUSH: tính tổng là biến đổi thuần túy (pure function)
const total$ = cartChanges$.pipe(
  map((items) => items.reduce((sum, i) => sum + i.price * i.qty, 0))
);

total$.subscribe((t) => (totalEl.textContent = t.toLocaleString('vi-VN')));
```

Phần `reduce` mang tính Pull (bạn gọi trực tiếp, giá trị có sẵn trong mảng của từng lần phát); phần `cartChanges$` mang tính Push (biết khi nào có dữ liệu mới nhờ stream). RxJS để bạn **ghép tự nhiên** hai phong cách này trong một pipe.

## 6.1. Cách ĐỌC một dòng code push

Khi gặp code RxJS của người khác, hãy tự hỏi ba câu theo đúng thứ tự:

1. **Ai là producer?** (`fromEvent`, `Subject`, `ajax`...) — trả lời được là biết dữ liệu từ đâu tới.
2. **Ai điều khiển nhịp?** (`debounceTime`, `throttleTime`, `concatMap`...) — trả lời được là biết khi nào dữ liệu được phép đi tiếp.
3. **Ai dừng luồng?** (`take`, `takeUntil`, `takeWhile`, unsubscribe...) — trả lời được là biết luồng sống đến khi nào.

Bốn dòng dưới đây chứa cả ba câu trả lời:

```javascript
fromEvent(window, 'resize')            // 1. producer: browser
  .pipe(
    throttleTime(100),                 // 2. nhịp: tối đa 1 lần/100ms
    map(() => computeLayout()),
    takeUntil(this.destroy$)           // 3. dừng: khi component hủy
  )
  .subscribe(render);
```

Nếu bạn trả lời được cả ba câu cho bất kỳ pipeline nào trong repo này, bạn đã vượt qua rào cản lớn nhất khi học RxJS: đọc code thay vì viết lại từ đầu.

## 7. Câu hỏi tự kiểm tra

1. `iterator.next()` do ai gọi — consumer hay producer? (đáp: consumer — Pull)
2. `observer.next()` do ai gọi? (đáp: producer — Push)
3. Vì sao Promise được xếp vào Push dù bạn phải gọi `.then`? (đáp: vì thời điểm có kết quả do producer quyết định; `.then` chỉ là đăng ký "đến khi có thì gọi tôi")
4. Vì sao Observable giữ được tính lười của Pull? (đáp: subscribe gọi thực thi — không subscribe thì producer không chạy)

## 8. Ghi nhớ

- Pull: consumer chủ động, `next()` do bạn gọi. Push: producer chủ động, `next()` do nó gọi.
- Function/Iterator = Pull; Promise/Observable = Push.
- Observable giữ được tính **lười** của Pull và tính **tự động** của Push — kết hợp tốt của cả hai thế giới.
- Toàn bộ Operator của RxJS (chương 2) chỉ là các cách **biến đổi luồng push** — giống cách biến đổi Array.

Bài sau: [3_observable_internals](../3_observable_internals) — tự tay xây dựng Observable để thấy Push hoạt động ra sao dưới nắp capo.

# Observer Pattern

> Observer patter cung cấp một mô hình đăng ký (subscription) trong đó các đối tượng đăng ký một sự kiện và nhận thông báo khi sự kiện xảy ra. Mô hình này là nền tảng của lập trình theo hướng sự kiện, bao gồm cả JavaScript.

## Using Observer

Khi xây dựng ứng dụng web, bạn phải viết nhiều trình xử lý sự kiện. Trình xử lý sự kiện là các chức năng sẽ được thông báo khi một sự kiện được kích hoạt.

Sự kiện và mô hình xử lý sự kiện trong JavaScript là thể hiện của Observer pattern.

![javascript-observer.jpg](javascript-observer.jpg)

Trong RxJS, một đối tượng có tên Subject lưu giữ danh sách Listeners đã đăng ký với nó. Bất cứ khi nào trạng thái Subject thay đổi (bắn đi event), nó sẽ thông báo cho tất cả các Listeners của nó (multicasting)

## Cấu trúc cơ bản của Observer Pattern

```
┌──────────────┐  subscribe()   ┌──────────────┐
│   Subject    │ ─────────────► │  Observer A  │
│ (Publisher)  │ ◄───────────── │              │
│              │   push data    │  Observer B  │
└──────────────┘ ─────────────► │  Observer C  │
                                └──────────────┘
```

Một Observer có **3 callback**:

| Callback | Ý nghĩa | Gọi bao nhiêu lần? |
| --- | --- | --- |
| `next(value)` | Nhận một giá trị mới | 0 → N lần |
| `error(err)` | Luồng gặp lỗi | tối đa 1 lần, sau đó kết thúc |
| `complete()` | Luồng kết thúc bình thường | tối đa 1 lần, sau đó kết thúc |

## Observer trong JavaScript đời thường (DOM Events)

Event listener chính là Observer Pattern bạn đã dùng hàng ngày mà không nhận ra:

```javascript
// button = Subject, hàm callback = Observer
const button = document.querySelector('#save');

const handler = (event) => console.log('clicked!', event);
button.addEventListener('click', handler);   // ← subscribe
button.removeEventListener('click', handler); // ← unsubscribe
```

## Observer trong RxJS 7

```javascript
import { of } from 'rxjs';

// Cách 1: truyền object Observer đầy đủ 3 callback
of(1, 2, 3).subscribe({
  next: value => console.log('Nhận:', value),
  error: err => console.error('Lỗi:', err),
  complete: () => console.log('Hoàn tất!')
});
// next: 1, next: 2, next: 3, Hoàn tất!

// Cách 2: chỉ quan tâm next (shorthand)
of('hello').subscribe(value => console.log(value));

// Sau complete() hoặc error(), mọi next() tiếp theo bị BỎ QUA (an toàn)
const { Observable } = require('rxjs');
new Observable(subscriber => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // ← sẽ KHÔNG được gửi đến observer
}).subscribe({
  next: v => console.log(v), // chỉ in ra 1
});
```

## Observer vs Iterator: hai mặt của một đồng xu

| | Iterator (Pull) | Observer (Push) |
| --- | --- | --- |
| Consumer chủ động | `iterator.next()` lấy giá trị | N/A |
| Producer chủ động | N/A | `observer.next(value)` đẩy giá trị |
| Báo kết thúc | `{ done: true }` | `complete()` |
| Báo lỗi | `throw` | `observer.error(err)` |

Khi ghép Observer (push) với khả năng xử lý luồng của Iterator, bạn có đúng **Observer Pattern hiện đại của RxJS** — và đó chính là `Observable`.

## Kết nối với chương tiếp theo

Trong thư mục [3_observable_internals](../../3_observable_internals) chúng ta sẽ tự viết lại Observer pattern này bằng code, để hiểu `subscribe()` thực sự làm gì bên dưới. Tài liệu chính thức: [RxJS – Observer](https://rxjs.dev/api/index/interface/Observer).
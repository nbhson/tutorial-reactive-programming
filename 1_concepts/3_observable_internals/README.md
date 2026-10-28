# Observable Internals

## Giá trị cốt lõi
Học cách tự xây dựng một `class Observable` từ đầu để hiểu rõ bản chất của nó: Nó chỉ là một hàm nhận vào một `observer`.

## Bạn sẽ học gì ở đây?
Trong thư mục này, chúng ta sẽ đi qua từng bước để xây dựng một Observable engine thu nhỏ:

1.  **[1_producer_consumer](./1_producer_consumer)**: Tạo ra cấu trúc Producer gửi dữ liệu cho Consumer.
2.  **[2_lazy_subscribe](./2_lazy_subscribe)**: Làm cho Observable trở nên "lười biếng" (Lazy) - chỉ chạy khi có người subscribe.
3.  **[3_lazy_unsubscribe](./3_lazy_unsubscribe)**: Thêm cơ chế hủy đăng ký (Unsubscribe) để tránh rò rỉ bộ nhớ.
4.  **[4_observer_pattern_v1](./4_observer_pattern_v1)** & **[5_observer_pattern_v2](./5_observer_pattern_v2)**: Hoàn thiện Observer safe (có next, error, complete).

## Bí mật của Observable
Observable thực chất chỉ là một function nhận vào một object có 3 callback (`next`, `error`, `complete`). Không có phép màu nào cả!

## Tự viết một Observable "mini" trong 15 dòng

```javascript
class MyObservable {
  constructor(subscribeFunction) {
    // Observable chỉ "giữ" hàm này, CHƯA chạy gì cả (lazy!)
    this._subscribe = subscribeFunction;
  }

  subscribe(observer) {
    // Chỉ khi có người subscribe, code trong constructor mới chạy
    return this._subscribe(observer);
  }
}

// Tạo một Observable — chưa có gì xảy ra
const numbers$ = new MyObservable(observer => {
  console.log('Bắt đầu chạy!');           // ← chỉ in ra sau khi subscribe
  observer.next(1);
  observer.next(2);
  observer.complete();
});

console.log('Trước subscribe');
numbers$.subscribe({
  next: v => console.log('Nhận:', v),
  error: err => console.error(err),
  complete: () => console.log('Done'),
});
// Output: "Trước subscribe" → "Bắt đầu chạy!" → 1 → 2 → Done
```

## Sự khác biệt then chốt so với Promise

```javascript
// Promise: EAGER — chạy ngay khi tạo
const p = new Promise(resolve => {
  console.log('Promise chạy ngay!'); // in ra NGAY, dù chưa ai .then()
});

// Observable: LAZY — chạy khi subscribe
const o$ = new MyObservable(observer => {
  console.log('Observable chỉ chạy khi subscribe!');
});
// ← cho đến dòng này, chưa có gì được in ra
```

Đây là lý do `switchMap` với HTTP request có thể **hủy request cũ** — vì Observable chưa bắt đầu cho đến khi được subscribe, và có thể bị hủy bằng `unsubscribe`.

## RxJS 7 thực tế

Cú pháp thật của RxJS 7.x — dùng `pipe()` để nối các operator:

```javascript
import { Observable, fromEvent } from 'rxjs';
import { map, take } from 'rxjs/operators';
// RxJS 7 khuyến nghị import operators từ 'rxjs' trực tiếp:
// import { map, take } from 'rxjs';

// Một Observable từ DOM event
const clicks$ = fromEvent(document, 'click').pipe(
  map(event => ({ x: event.clientX, y: event.clientY })),
  take(3) // tự hoàn tất sau 3 lần click
);

const subscription = clicks$.subscribe(pos => console.log(pos));
// Hủy đăng ký khi không cần nữa (tránh memory leak)
// subscription.unsubscribe();
```

## Điều gì làm nên sức mạnh của Observable so với callback/Promise?

| Tính năng | Promise | Callback | Observable |
| --- | --- | --- | --- |
| Đơn giá trị (single) | ✅ | ✅ | ✅ |
| Nhiều giá trị theo thời gian | ❌ | ❌ | ✅ |
| Lazy (chạy khi được yêu cầu) | ❌ | ❌ | ✅ |
| Có thể hủy (cancel) | ❌ | ❌ | ✅ (`unsubscribe`) |
| Có thể compose với operators | ❌ | ❌ | ✅ (`pipe`, `map`, `filter`...) |
| Trạng thái lỗi riêng (`error`) | ✅ | ❌ | ✅ |

Tài liệu chính thức: [RxJS – Observable](https://rxjs.dev/api/class/Observable), [RxJS – Notification lifecycle](https://rxjs.dev/guide/observable).

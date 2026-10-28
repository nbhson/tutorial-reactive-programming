# Iterator Pattern

> Iterator pattern cho phép người dùng lặp qua một tập hợp các đối tượng một cách hiệu quả.

## Using Iterator

Điểm chung của lập trình thông thường là duyệt và thao tác một tập hợp các đối tượng. Các collections này có thể được lưu trữ dưới dạng một mảng hoặc có thể là một cái gì đó phức tạp hơn, chẳng hạn như cấu trúc cây hoặc đồ thị.

Iterator pattern giải quyết vấn đề này bằng cách tách tập hợp các đối tượng khỏi việc truyền tải các đối tượng này bằng cách triển khai một trình lặp chuyên dụng (tách các thuật toán ra khỏi vùng chứa).

Ngày nay, nhiều ngôn ngữ đã tích hợp sẵn Iterators bằng cách hỗ trợ các cấu trúc kiểu 'for-each' và giao diện IEnumerable và IEnumerator. Tuy nhiên, JavaScript chỉ hỗ trợ lặp cơ bản dưới dạng câu lệnh for, for-in, while và do while.

Iterator pattern cho phép các nhà phát triển JavaScript thiết kế các cấu trúc lặp linh hoạt và phức tạp hơn nhiều.

![javascript-iterator.jpg](javascript-iterator.jpg)

## Iterator trong JavaScript hiện đại (ES2015+)

Từ ES2015, JavaScript đã chính thức hỗ trợ **iteration protocol** với hai thành phần:

- **Iterable protocol**: object có method `[Symbol.iterator]()` trả về một iterator.
- **Iterator protocol**: object có method `next()` trả về `{ value, done }`.

```javascript
// Một iterator tự viết
function createCounter(max) {
  let current = 0;
  return {
    [Symbol.iterator]() {
      return {
        next() {
          return current < max
            ? { value: ++current, done: false }
            : { value: undefined, done: true };
        }
      };
    }
  };
}

for (const n of createCounter(3)) {
  console.log(n); // 1, 2, 3
}
```

Array, String, Map, Set đều là iterable. Generator (`function*`) là cách viết iterator gọn nhất:

```javascript
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {        // stream vô hạn!
    yield a;
    [a, b] = [b, a + b];
  }
}

const fib = fibonacci();
console.log(fib.next().value); // 0
console.log(fib.next().value); // 1
console.log(fib.next().value); // 1
console.log(fib.next().value); // 2
```

## Tại sao Iterator quan trọng với Reactive Programming?

**Vì Iterator là nửa còn lại của bức tranh Pull vs Push.** Hãy so sánh hai mô hình:

| Khía cạnh | Iterator (Pull) | Observable (Push) |
| --- | --- | --- |
| Ai quyết định? | **Consumer** chủ động gọi `next()` để "kéo" | **Producer** chủ động "đẩy" giá trị cho consumer |
| Thời điểm nhận giá trị | Consumer chọn khi nào lấy | Producer chọn khi nào gửi |
| Dữ liệu bất đồng bộ | Khó (phải kết hợp Promise) | Tự nhiên (value có thể đến bất cứ lúc nào) |
| Ký hiệu toán học | `Iterable<T>` | `Observable<T>` |

```javascript
// PULL: mảng + iterator — bạn phải "kéo" từng giá trị
const arr = [10, 20, 30];
const it = arr[Symbol.iterator]();
console.log(it.next()); // { value: 10, done: false } ← bạn quyết định lấy

// PUSH: Observable — giá trị tự "đẩy" đến bạn
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';

interval(1000).pipe(take(3)).subscribe(value => {
  console.log(value); // 0, 1, 2 ← hệ thống quyết định khi nào đẩy
});
```

**Điểm mấu chốt:** Iterator và Observable có cấu trúc interface gần như đối xứng nhau:

```javascript
// Iterator  : next()      → { value, done }
// Observer  : next(value), error(err), complete()
```

Khi bạn hiểu Iterator (pull), Observer (phần tiếp theo) sẽ là tấm gương phản chiếu — và Observable chính là "Iterator bất đồng bộ, theo hướng push". Đây là lý do chương này đặt Iterator trước Observer.

Tài liệu: [MDN – Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).

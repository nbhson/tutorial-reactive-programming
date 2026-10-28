# Memory Management

## Giá trị cốt lõi
Tránh Memory Leak (rò rỉ bộ nhớ) - sát thủ thầm lặng của ứng dụng web.

## Khi nào cần Unsubscribe?
Khi bạn subscribe vào một stream **vô hạn** (như `interval`, `fromEvent`, `Subject`). Nếu component bị hủy mà subscription vẫn còn, nó sẽ tiếp tục chạy ngầm -> Tốn RAM và gây lỗi logic.

## Chiến lược Unsubscribe
1.  **Thủ công**: Lưu `subscription` vào biến rồi gọi `sub.unsubscribe()` trong `ngOnDestroy` (Angular) hoặc `useEffect cleanup` (React). -> Dễ quên!
2.  **`take(1)` / `first()`**: Tự động unsubscribe sau khi nhận 1 giá trị. (Dùng cho HTTP request).
3.  **`takeUntil(destroy$)`**: (Best Practice). Tự động unsubscribe khi một stream khác (destroy$) phát tín hiệu.
4.  **Async Pipe**: (Angular only). Để framework tự lo liệu.

## So sánh trực quan bằng code RxJS 7

```javascript
import { Subject, interval, fromEvent, of } from 'rxjs';
import { takeUntil, take, first, takeWhile } from 'rxjs/operators';

// ── 1. Chiến lược THỦ CÔNG ────────────────────────────────
class ManualComponent {
  subscription;
  ngOnInit() {
    this.subscription = interval(1000).subscribe(() => this.poll());
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe(); // quên dòng này = memory leak!
  }
}

// ── 2. take(1) / first() — tự unsubscribe sau 1 giá trị ────
// Phù hợp cho HTTP request (one-shot)
of(fetchUser())
  .pipe(first())       // nhận 1 giá trị rồi tự complete + unsubscribe
  .subscribe(user => console.log(user));

// ⚠️ Khác biệt tinh tế: nếu stream KHÔNG bao giờ emit,
//    first() sẽ báo lỗi EmptyError, còn take(1) chỉ im lặng.

// ── 3. takeUntil(destroy$) — Best Practice cho stream dài hạn ──
export class DashboardComponent {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Stream vô hạn nhưng an toàn: tự hủy cùng component
    interval(5000).pipe(
      switchMap(() => this.http.get('/api/stats')),
      takeUntil(this.destroy$)
    ).subscribe(data => this.update(data));
  }

  ngOnDestroy() {
    this.destroy$.next();     // phát tín hiệu "chết"
    this.destroy$.complete(); // dọn dẹp Subject
  }
}

// ── 4. takeWhile — hủy theo điều kiện nghiệp vụ ────────────
interval(1000).pipe(
  takeWhile((_, index) => index < 10), // chạy đến khi điều kiện sai
  // Lưu ý: takeWhile không phát giá trị khiến điều kiện sai.
  // Nếu muốn nhận cả giá trị đó, dùng { inclusive: true } (RxJS 7.2+):
  // takeWhile((_, i) => i < 10, true)
).subscribe();
```

## React: unsubscribe trong `useEffect` cleanup

```jsx
import { useEffect, useState } from 'react';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const destroy$ = new Subject();
    const sub = interval(1000)
      .pipe(takeUntil(destroy$))
      .subscribe(() => setNow(new Date()));

    return () => {
      sub.unsubscribe();     // hoặc destroy$.next()
      destroy$.complete();
    };
  }, []);

  return <span>{now.toLocaleTimeString()}</span>;
}
```

## Công cụ phát hiện Memory Leak

1. **Chrome DevTools → Performance**: ghi lại 30s, nếu heap tăng liên tục khi điều hướng qua lại trang → nghi ngờ leak.
2. **DevTools → Memory → Heap Snapshot**: so sánh 2 snapshot, tìm objects còn được giữ bởi closure của subscription.
3. **RxJS 7**: bật cảnh báo lỗi khi subscription còn sống sau complete:

```javascript
import { config } from 'rxjs';
// RxJS 7: cấu hình onUnhandledError, hoặc dùng tap để log lifecycle
interval(1000).pipe(
  tap({ unsubscribe: () => console.log('đã hủy — kiểm tra xem có chạy không!') })
).subscribe();
```

## Quy tắc vàng

> **Không cần unsubscribe khi stream có giới hạn (finite)** — tức là nó tự `complete()` (ví dụ `of()`, `http.get()`, `take(n)`, `first()`, `takeUntil(...)` đã gắn).
>
> **Bắt buộc phải unsubscribe khi stream vô hạn (infinite)** — `interval()`, `timer()`, `fromEvent()`, `Subject` không bao giờ tự complete.

Tài liệu: [RxJS – Subscription](https://rxjs.dev/api/index/interface/Subscription), [RxJS – takeUntil](https://rxjs.dev/api/operators/takeUntil).

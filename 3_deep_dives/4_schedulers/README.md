# Schedulers

## Giá trị cốt lõi
Kiểm soát **khi nào** (Context) một sự kiện được thực thi.

## Các loại Scheduler
1.  **null (Synchronous)**: Mặc định. Chạy ngay lập tức và đồng bộ. (Giống `for` loop).
2.  **asapScheduler (Microtask)**: Chạy sau khi code đồng bộ hiện tại xong, nhưng trước khi render UI. (Giống `Promise.resolve()`).
3.  **asyncScheduler (Macrotask)**: Chạy ở event loop tiếp theo. (Giống `setTimeout(fn, 0)`).
4.  **queueScheduler**: Dùng cho đệ quy sâu để tránh Stack Overflow.
5.  **animationFrameScheduler**: Chạy trước khi trình duyệt vẽ lại (repaint). Dùng cho Animation mượt mà.

## Khi nào cần dùng?
Hầu hết thời gian bạn không cần quan tâm. RxJS tự chọn cái tốt nhất cho bạn. Bạn chỉ cần can thiệp khi muốn test hoặc optimize animation.

## Nhớ Event Loop để hiểu Scheduler

```
┌───────────────────────── Event Loop ─────────────────────────┐
│                                                              │
│  Call Stack (code sync)  →  Microtask  →  Macrotask → Render │
│                            (Promise,      (setTimeout,   (rAF)│
│                             queueMicrotask)(setInterval)     │
└──────────────────────────────────────────────────────────────┘
```

## RxJS 7: Scheduler có sẵn trong thư viện

```javascript
import { of, asyncScheduler, asapScheduler, queueScheduler,
         animationFrameScheduler, observeOn, subscribeOn } from 'rxjs';

// 1. null (mặc định) — đồng bộ, chạy ngay như for-loop
of(1, 2, 3).subscribe(console.log); // in 1,2,3 NGAY, trước cả dòng dưới

// 2. asapScheduler — Microtask (giống queueMicrotask/Promise)
of('asap').pipe(observeOn(asapScheduler))
  .subscribe(console.log); // chạy sau code sync, trước render

// 3. asyncScheduler — Macrotask (giống setTimeout)
of('async').pipe(observeOn(asyncScheduler))
  .subscribe(console.log); // chạy ở event loop sau

// 4. queueScheduler — hàng đợi đệ quy, chống tràn stack
function recursive$(n) {
  return of(n).pipe(
    observeOn(queueScheduler),
  );
}

// 5. animationFrameScheduler — trước mỗi lần vẽ lại màn hình (~16ms)
import { interval } from 'rxjs';
interval(0, animationFrameScheduler)
  .subscribe(() => moveBox()); // animation mượt 60fps, không jank
```

## Ví dụ: delay(0) ≠ subscribe đồng bộ

```javascript
import { of, delay } from 'rxjs';

console.log('A');
of(1).pipe(delay(0)).subscribe(() => console.log('B')); // setTimeout(0) bên dưới
console.log('C');
// Thứ tự in: A → C → B (vì delay mặc định dùng asyncScheduler/macrotask)
```

## Scheduler trong operator tạo nguồn (RxJS 7)

Một số operator nhận scheduler làm tham số cuối — nhưng **RxJS 7 đang loại bỏ dần overloads chứa scheduler**, khuyến nghị dùng `observeOn`/`subscribeOn` trong `pipe` thay thế:

```javascript
// RxJS 6 (cũ): from([1,2,3], asyncScheduler)
// RxJS 7 (khuyến nghị):
import { from, asyncScheduler, observeOn } from 'rxjs';

from([1, 2, 3]).pipe(
  observeOn(asyncScheduler) // chuyển việc phát giá trị sang macrotask
).subscribe(console.log);
```

## Ứng dụng thực tế 1: chuyển từ blocking sang non-blocking

```javascript
// Tính toán nặng chặn UI → chia nhỏ bằng animationFrameScheduler
import { range, observeOn, animationFrameScheduler, bufferCount } from 'rxjs';

range(0, 1_000_000)
  .pipe(
    observeOn(animationFrameScheduler), // nhường nhịp vẽ cho trình duyệt
    bufferCount(100_000),
  )
  .subscribe(chunk => heavyProcess(chunk)); // UI không bị đơ
```

## Thực tế: khi nào thực sự cần scheduler?

| Tình huống | Giải pháp |
| --- | --- |
| Test code bất đồng bộ | `TestScheduler` + marble diagram (xem `5_testing`) |
| Animation 60fps | `animationFrameScheduler` thay vì `interval(16)` |
| Đệ quy sâu | `queueScheduler` tránh tràn stack |
| ƯU TIÊU render trước khi xử lý | `asapScheduler` (microtask) |

Tài liệu chính thức: [RxJS – Scheduler](https://rxjs.dev/api/index/interface/SchedulerLike), [RxJS Guide – Scheduler](https://rxjs.dev/guide/scheduler).

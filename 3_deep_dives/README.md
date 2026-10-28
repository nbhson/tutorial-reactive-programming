# Chương 3: Deep Dives (Advanced & Mechanics)

## Giá trị cốt lõi
Sau khi biết cách dùng Operators, bạn cần hiểu sâu về cơ chế hoạt động của RxJS để tránh những lỗi tiềm ẩn (Memory Leak, Race Condition) và tối ưu hiệu năng.

## Nội dung chính

1.  **[hot_vs_cold](./1_hot-vs-cold)**: Tại sao có Observable chia sẻ dữ liệu được, có cái lại chạy lại từ đầu mỗi khi subscribe? (Unicast vs Multicast).
2.  **[schedulers](./4_schedulers)**: Điều khiển thời điểm code của bạn chạy (Sync, Microtask, Macrotask, AnimationFrame).
3.  **[testing](./5_testing)**: Cách viết Unit Test cho code bất đồng bộ bằng Marble Diagrams.
4.  **[memory_management](./2_memory-management)**: Chiến lược Unsubscribe hiệu quả để tránh Memory Leak.
5.  **[playground_project](./3_playground-project)**: Một dự án nhỏ để chạy thử code.

> Lưu ý đường dẫn thực tế trong repo: `1_hot-vs-cold`, `2_memory-management`, `3_playground-project`, `4_schedulers`, `5_testing`.

## Cài đặt & chuẩn bị môi trường

Toàn bộ ví dụ chương này dùng **RxJS 7.8.2** (bản ổn định `latest` trên npm). RxJS 9 hiện đang beta — tuyệt đối không dùng cho production.

```bash
npm install rxjs@7.8.2
```

## Bảng tóm tắt nhanh các chủ đề

| Chủ đề | Vấn đề giải quyết | Operator/API then chốt |
| --- | --- | --- |
| Hot vs Cold | Ai giữ nguồn dữ liệu? Request bị lặp lại khi nào? | `share()`, `shareReplay(1)`, `Subject` |
| Schedulers | Code chạy đồng bộ hay bất đồng bộ, trước/sau khi render? | `asyncScheduler`, `queueScheduler`, `observeOn` |
| Testing | Test code bất đồng bộ không cần chờ thật | `TestScheduler`, marble syntax |
| Memory management | Component hủy mà stream vẫn chạy ngầm → leak | `takeUntil`, `take(1)`, `first()` |

## Ví dụ minh họa chủ đề "đắt" nhất: Hot vs Cold

Một HTTP request (cold) sẽ **chạy lại mỗi khi subscribe** — nếu 3 component cùng subscribe một stream dữ liệu, bạn sẽ bắn 3 request trùng lặp:

```javascript
import { ajax } from 'rxjs/ajax';
import { shareReplay } from 'rxjs/operators';

// ❌ COLD: mỗi subscribe = một HTTP request mới
const user$ = ajax.getJSON('/api/user/1');
user$.subscribe(a => console.log('Component A:', a)); // request 1
user$.subscribe(b => console.log('Component B:', b)); // request 2 (lặp lại!)

// ✅ HOT (multicast): một request duy nhất, mọi subscriber dùng chung
const userShared$ = ajax.getJSON('/api/user/1').pipe(
  shareReplay({ bufferSize: 1, refCount: true }) // cache 1 giá trị cuối
);
userShared$.subscribe(a => console.log('A:', a)); // request 1
userShared$.subscribe(b => console.log('B:', b)); // dùng lại cache, không request
```

## Bẫy Memory Leak kinh điển

```javascript
import { interval } from 'rxjs';

// Component này bị unmount nhưng interval vẫn chạy ngầm mãi mãi
class BadComponent {
  ngOnInit() {
    interval(1000).subscribe(() => this.fetchData()); // ❌ không ai hủy
  }
}

// Cách đúng: takeUntil gắn với vòng đời component
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

class GoodComponent {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    interval(1000)
      .pipe(
        switchMap(() => this.fetchData()),
        takeUntil(this.destroy$) // tự hủy khi destroy$
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

Chi tiết từng chiến lược được phân tích trong [2_memory-management](./2_memory-management).

## Cách đọc chương này

1. Bắt đầu với `1_hot-vs-cold` — đây là khái niệm dễ gây bug nhất trong thực tế (request trùng lặp, state không đồng bộ).
2. Đọc `2_memory-management` ngay sau đó để có thói quen unsubscribe an toàn từ đầu.
3. `4_schedulers` và `5_testing` phục vụ khi bạn optimize và viết test — có thể đọc sau.
4. Cuối cùng, mở `3_playground-project` để gõ lại mọi ví dụ bằng tay.

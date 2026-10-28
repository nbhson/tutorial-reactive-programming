# Chương 4: Architectural Patterns

## Giá trị cốt lõi

Học cách ghép nối các Operators lại thành một kiến trúc ứng dụng hoàn chỉnh. Không chỉ xử lý sự kiện đơn lẻ — mà quản lý toàn bộ **Flow** của ứng dụng.

## Các Patterns trong chương

### 1. [1_state-management](./1_state-management) — Service as a Store

Quản lý trạng thái ứng dụng với `BehaviorSubject`: một nguồn chân lý duy nhất (Single Source of Truth), component chỉ được đọc (`asObservable()`), Service mới được ghi.

```
Components ──read──> state$ <──private── _state (BehaviorSubject)
                              └─write── Service methods
```

**Operator/API then chốt**: `BehaviorSubject`, `asObservable()`.

### 2. [2_action_reaction](./2_action_reaction) — Action–Reaction (MVI)

Mô hình Uni-directional Data Flow: người dùng gửi **Action** (Intent) → Model **phản ứng** (tính state mới bằng `scan`) → View render từ state.

```
User ──intent──> actions$ (Subject) ──scan──> state$ ──render──> View
   ^                                                            │
   └────────────────────────── vòng lặp ────────────────────────┘
```

**Operator/API then chốt**: `Subject`, `scan`, `startWith`, `shareReplay`.

### 3. [3_polling](./3_polling) — Smart Polling

Gọi API định kỳ một cách thông minh:
- **Pause/Resume** theo vòng đời tab (`visibilitychange`).
- **Không chồng chéo** request (dùng `switchMap`/`exhaustMap`).
- **Retry với exponential backoff** khi API lỗi, không làm chết luồng polling.

```
startStop$ ──switchMap──> timer(0, interval) ──switchMap──> API
                                │                              │
                                │                        retry({delay: backoff})
                                └── dừng khi người dùng stop hoặc tab ẩn
```

**Operator/API then chốt**: `timer`, `switchMap`, `takeWhile`/`takeUntil`, `retry({ delay })`, `fromEvent(document, 'visibilitychange')`.

## So sánh ba patterns

| Pattern | Vấn đề giải quyết | Điểm khó nhất |
| --- | --- | --- |
| State management | Nhiều component chia sẻ một state | Không ai được ghi đè state tu tiện |
| Action–Reaction | Logic xử lý nằm rải rác trong event handlers | Định dạng Action và thu gọn state bằng `scan` |
| Polling | Request chồng chéo, polling chạy khi tab ẩn, chết khi API lỗi | Không để một lỗi đơn lẻ giết vòng polling |

## Quy tắc chung khi xây pattern bằng RxJS

1. **State chỉ chảy một chiều** — từ nguồn đến UI. UI không bao giờ ghi trực tiếp vào state; nó phát Action.
2. **Mỗi luồng có một "chủ" duy nhất** — ai khởi tạo, ai hủy, rõ ràng từ đầu (dùng `takeUntil` gắn vòng đời).
3. **Lỗi phải được xử lý tại đúng tầng** — một lỗi đơn lẻ không được phép kết thúc stream nền (như vòng polling).
4. **Đặt tên biến Observable với hậu tố `$`** — giúp phân biệt ngay giá trị tĩnh và luồng.

## Chọn pattern nào cho bài toán của bạn?

Hỏi mình hai câu:

**Câu 1: Dữ liệu đến từ đâu?**

```
Từ thời gian (định kỳ, theo nhịp)          → Polling (bài 3)
Từ hành động người dùng (click, gõ phím)   → Action–Reaction (bài 2)
Từ nhiều nguồn cần trộn thành một          → State management (bài 1)
```

**Câu 2: State thay đổi theo cách nào?**

```
Thay thế nguyên khối (load lại, refresh)   → BehaviorSubject đơn giản (bài 1)
Tích lũy dần theo từng hành động           → scan / mergeScan (bài 2)
Có chu kỳ bắt đầu / kết thúc rõ ràng       → switchMap với tín hiệu điều khiển (bài 3)
```

## Code mẫu nhanh cho từng pattern

### Bài 1 — Store tối thiểu (12 dòng)

```typescript
import { BehaviorSubject } from 'rxjs';

class CounterStore {
  private _count = new BehaviorSubject(0);
  readonly count$ = this._count.asObservable(); // chỉ đọc cho bên ngoài

  increment() { this._count.next(this._count.value + 1); }
  reset()     { this._count.next(0); }
}
```

### Bài 2 — Reducer + scan tối thiểu

```typescript
import { Subject, scan } from 'rxjs';

const actions$ = new Subject<Action>();
const state$ = actions$.pipe(scan(reducer, initialState));
// mọi nút bấm chỉ next() Action vào actions$ — không đụng state trực tiếp
```

### Bài 3 — Vòng polling tối thiểu

```typescript
import { timer } from 'rxjs';
import { switchMap, retry } from 'rxjs';

timer(0, 5000).pipe(
  switchMap(() => fetchStatus()),
  retry({ delay: (_e, n) => timer(Math.min(1000 * 2 ** (n - 1), 30_000)) })
);
```

## Kết nối với các chương khác

| Chủ đề của chương 4 | Dựa trên kiến thức từ |
| --- | --- |
| `BehaviorSubject` là hot source | [3_deep_dives/1_hot-vs-cold](../3_deep_dives/1_hot-vs-cold) |
| `scan` / `mergeScan` | [2_operators/2_transformation-operator](../2_operators/2_transformation-operator) |
| `switchMap` tầng điều khiển | [2_operators/7_higher-order-observable](../2_operators/7_higher-order-observable) |
| `retry({ delay })` backoff | [2_operators/6_error-handling](../2_operators/6_error-handling) |
| Hủy theo vòng đời | [3_deep_dives/2_memory-management](../3_deep_dives/2_memory-management) |

Ba bài của chương này không dùng một API mới nào ngoài chương 2 — chúng chỉ **ghép** các operator đã học theo cấu trúc. Nếu đọc đến đây thấy khó, quay lại đúng bài ở cột "từ" của bảng trên.

## Thứ tự đọc gợi ý

1. Đọc [1_state-management](./1_state-management) trước — nó là "viên gạch" nhỏ nhất, mọi pattern khác đều dùng lại ý tưởng Subject + Observable chỉ đọc.
2. Đọc [2_action_reaction](./2_action_reaction) — nâng store thành luồng Action một chiều.
3. Đọc [3_polling](./3_polling) — pattern dùng cả hai kỹ năng trên cộng thêm xử lý thời gian và lỗi.

Mỗi bài có sơ đồ mermaid, code TypeScript hoàn chỉnh, mục "cạm bẫy" và bảng tóm tắt operator. Nếu chưa chắc về hot/cold hay `shareReplay`, quay lại [3_deep_dives/1_hot-vs-cold](../3_deep_dives/1_hot-vs-cold) trước khi đọc bài 1.

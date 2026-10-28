# Tutorial Reactive Programming — RxJS từ số 0 đến thực chiến

> Tài liệu tiếng Việt về **RxJS**: từ tư duy Reactive, Operators, cơ chế sâu bên trong, cho đến các pattern và bài tập thực tế.
> Văn phong: xưng hô "bạn", code demo chạy được, mọi operator đều đúng chuẩn **RxJS 7.8.x** (không bịa API).

---

## Mục lục

### Chương 1 — [1_concepts](./1_concepts): Tư duy Reactive (Foundations)

Nền tảng lý thuyết — **tại sao** cần RxJS và cơ chế hoạt động của Observable.

| Bài | Nội dung |
| --- | --- |
| [0_imperative_vs_reactive](./1_concepts/0_imperative_vs_reactive) | Imperative vs Reactive: từ "gán giá trị" sang "khai báo quan hệ" |
| [1_sync_vs_async](./1_concepts/1_sync_vs_async) | Callback → Promise → Observable; giới hạn của Promise |
| [2_pull_vs_push](./1_concepts/2_pull_vs_push) | Pull (Iterator) vs Push (Observer) — nền tảng của RxJS |
| [3_observable_internals](./1_concepts/3_observable_internals) | Tự xây dựng Observable từ đầu: producer/consumer, lazy subscribe/unsubscribe |

### Chương 2 — [2_operators](./2_operators): Operators

Toàn bộ operator theo nhóm, kèm ví dụ và marble diagram.

| Bài | Nội dung |
| --- | --- |
| [0_overview](./2_operators/0_overview) | Bản đồ operator: các nhóm, marble diagram, bảng tra cứu nhanh |
| [1_create-operator](./2_operators/1_create-operator) | Creation operators: `of`, `from`, `fromEvent`, `interval`, `timer`... |
| [2_transformation-operator](./2_operators/2_transformation-operator) | `map`, `scan`, `buffer*`, `pairwise`... |
| [3_filtering](./2_operators/3_filtering) | `filter`, `take*`, `debounceTime`, `throttleTime`, `distinctUntilChanged`... |
| [4_timer](./2_operators/4_timer) | Làm việc với thời gian: `delay`, `timeout`, `auditTime`... |
| [5_combination](./2_operators/5_combination) | `combineLatest`, `merge`, `concat`, `zip`, `forkJoin`, `withLatestFrom`... |
| [6_error-handling](./2_operators/6_error-handling) | `catchError`, `retry`, `throwIfEmpty`, `defaultIfEmpty`, `iif`... |
| [7_higher-order-observable](./2_operators/7_higher-order-observable) | `switchMap` / `mergeMap` / `concatMap` / `exhaustMap` — phần quan trọng nhất |
| [8_utility-operators](./2_operators/8_utility-operators) | `tap`, `finalize`, `delay`, `share`... |
| [9_subjects-and-multicasting](./2_operators/9_subjects-and-multicasting) | `Subject`, `BehaviorSubject`, `ReplaySubject`, `AsyncSubject`, `share()` |

### Chương 3 — [3_deep_dives](./3_deep_dives): Cơ chế sâu

| Bài | Nội dung |
| --- | --- |
| [1_hot-vs-cold](./3_deep_dives/1_hot-vs-cold) | Cold vs Hot Observable, `share()`, `shareReplay({bufferSize, refCount})` |
| [2_memory-management](./3_deep_dives/2_memory-management) | Unsubscribe, `takeUntil`, tránh memory leak |
| [3_playground-project](./3_deep_dives/3_playground-project) | Project nhỏ để chạy thử mọi ví dụ |
| [4_schedulers](./3_deep_dives/4_schedulers) | `asyncScheduler`, `queueScheduler`, `animationFrameScheduler` |
| [5_testing](./3_deep_dives/5_testing) | `TestScheduler`, marble syntax từng ký tự, virtual time, test error/retry |

### Chương 4 — [4_patterns](./4_patterns): Pattern thực hành

| Bài | Nội dung |
| --- | --- |
| [1_state-management](./4_patterns/1_state-management) | Service as a Store với `BehaviorSubject` |
| [2_action_reaction](./4_patterns/2_action_reaction) | Action–Reaction (MVI): Intent → Model → View với `scan` |
| [3_polling](./4_patterns/3_polling) | Polling thông minh: pause/resume, không chồng chéo, retry với backoff |

### Chương 5 — [5_practices](./5_practices): Ứng dụng thực tế

| Bài | Nội dung |
| --- | --- |
| [1_auto_reload_data](./5_practices/1_auto_reload_data) | Tự tải lại dữ liệu định kỳ + nút refresh thủ công (project chạy được) |
| [2_infinite_scroll](./5_practices/2_infinite_scroll) | Tải thêm khi cuộn trang: `throttleTime` + `concatMap` + phân trang |
| [3_websocket_realtime](./5_practices/3_websocket_realtime) | Realtime với WebSocket: `webSocket`, reconnect, heartbeat, share dữ liệu |

---

## Lộ trình học gợi ý

Nếu bạn mới bắt đầu, đi theo thứ tự này (đừng nhảy cóc):

```
Bước 1  1_concepts/0_imperative_vs_reactive   (hiểu tư duy)
Bước 2  1_concepts/1_sync_vs_async            (vì sao Promise chưa đủ)
Bước 3  1_concepts/2_pull_vs_push             (nền tảng lý thuyết — đọc KỸ)
Bước 4  1_concepts/3_observable_internals     (tự code Observable — gõ lại bằng tay)
Bước 5  2_operators/0_overview                (bản đồ tổng thể)
Bước 6  2_operators/1 → 5                     (lần lượt từng nhóm operator)
Bước 7  2_operators/7_higher-order-observable (đọc 2 lần, đây là phần "ăn tiền" nhất)
Bước 8  2_operators/6, 8, 9                   (lỗi, utility, multicasting)
Bước 9  3_deep_dives/1_hot-vs-cold            (khái niệm dễ gây bug nhất thực tế)
Bước 10 3_deep_dives/2_memory-management      (thói quen unsubscribe an toàn)
Bước 11 3_deep_dives/4_schedulers + 5_testing (khi cần optimize / viết test)
Bước 12 4_patterns → 5_practices              (ghép tất cả thành ứng dụng hoàn chỉnh)
```

Nếu bạn đã quen RxJS và chỉ cần tra nhanh: mở [2_operators/0_overview](./2_operators/0_overview) (bảng tra cứu) hoặc [5_testing](./3_deep_dives/5_testing) (marble syntax).

---

## Bảng phiên bản RxJS (cập nhật 10/2026)

| Phiên bản | Tag npm | Ngày phát hành | Trạng thái | Dùng cho |
| --- | --- | --- | --- | --- |
| **7.8.2** | `latest` | 22/02/2025 | Ổn định, được maintain | ✅ Production — toàn bộ tutorial này |
| **9.0.0-beta.1** | `next` | 09/10/2026 | Pre-release | ❌ Chỉ để theo dõi, thử nghiệm |
| 9.0.0-beta.0 | — | 04/08/2026 | Pre-release | ❌ Đã thay bằng beta.1 |
| 8.0.0-alpha.14 | — | 12/01/2024 | Bỏ dở, không tiếp tục | ❌ Không dùng |

> **Kiểm chứng** (nguồn: [npmjs.com/package/rxjs](https://www.npmjs.com/package/rxjs) và [GitHub Releases của ReactiveX/rxjs](https://github.com/ReactiveX/rxjs/releases), truy cập 10/2026): `7.8.2` vẫn là bản `latest` với ~39 triệu lượt tải/tuần; dòng `next` đang là `9.0.0-beta.1` (publish ngày 09/10/2026). Dòng 8.x alpha đã bị bỏ, nhảy thẳng lên 9. **Toàn bộ ví dụ trong repo theo chuẩn 7.x** — khi RxJS 9 ra bản stable, tài liệu sẽ được cập nhật riêng.

Một số thay đổi đáng chú ý đã xác nhận của hướng 9.x (từ release notes beta.0): `expand` bỏ tham số scheduler, tách gói `@rxjs/observable`. Các breaking change đầy đủ sẽ được ghi khi 9.x ổn định.

---

## Setup chung

### Cài đặt

```bash
mkdir my-rxjs-lab && cd my-rxjs-lab
npm init -y
npm install rxjs@7.8.2
npm install --save-dev typescript ts-node @types/node
```

### Chạy ví dụ TypeScript

Tạo `tsconfig.json` tối thiểu:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Chạy một file ví dụ:

```bash
npx ts-node src/index.ts
```

### Import đúng chuẩn RxJS 7

RxJS 7 gom hết về **một entry point duy nhất** — cả creation operator lẫn pipeable operator:

```typescript
// ✅ Chuẩn RxJS 7: mọi thứ từ 'rxjs'
import { of, fromEvent, map, filter, switchMap, catchError } from 'rxjs';

of(1, 2, 3, 4)
  .pipe(
    filter((n) => n % 2 === 0),
    map((n) => n * 10)
  )
  .subscribe(console.log);
// 20, 40
```

```typescript
// ❌ Chuẩn RxJS 5/6 cũ — KHÔNG dùng nữa
// import { map } from 'rxjs/operators';      // vẫn chạy nhưng đã deprecated
// import { Observable } from 'rxjs/Observable'; // đường import từng file, không còn
```

Chỉ còn một ngoại lệ cần import đường dẫn riêng: **`TestScheduler`** nằm trong `'rxjs/testing'`:

```typescript
import { TestScheduler } from 'rxjs/testing';
```

và các tiện ích Ajax/WebSocket nằm trong `'rxjs/ajax'` / `'rxjs/webSocket'`.

### Quy ước đặt tên trong tài liệu

- Biến Observable kết thúc bằng `$`: `user$`, `clicks$`, `state$`.
- `Subject` dùng cho multicast: `actions$`, `destroy$`.
- Ví dụ DOM (`fromEvent(document, ...)`) cần chạy trong browser; ví dụ không DOM chạy được bằng `ts-node`.

---

## Tài liệu chính thức (nguồn kiểm chứng)

- <https://rxjs.dev> — API reference + marble diagram cho từng operator
- <https://rxjs.dev/guide/observable> — Observable, Observer, Subscription
- <https://rxjs.dev/guide/operators> — Pipeable vs Creation operators
- <https://rxjs.dev/guide/testing> — TestScheduler và marble testing
- <https://rxjs.dev/guide/marble-diagrams> — Cú pháp marble diagram
- Repo: <https://github.com/ReactiveX/rxjs> (tài liệu guide nằm ở `docs_app/content/guide/`)

---

*Cập nhật lần cuối: 10/2026. Các đường dẫn bên dưới tính từ thư mục gốc của tutorial.*

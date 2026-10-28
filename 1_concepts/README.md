# Chương 1: Tư duy Reactive (Foundations)

Chào mừng bạn đến với chương đầu tiên. Trước khi viết bất kỳ dòng code RxJS nào, chúng ta cần thay đổi **cách tư duy** (Mindset).

Reactive Programming không chỉ là một thư viện, đó là một mô hình lập trình tập trung vào việc xử lý các luồng dữ liệu bất đồng bộ.

## Nội dung chính

1.  **[0_imperative_vs_reactive](./0_imperative_vs_reactive)**: Sự khác biệt cốt lõi giữa lập trình mệnh lệnh (Imperative) và phản ứng (Reactive). Tại sao `b = a + 1` lại khác với `b$ = a$.map(x => x + 1)`.
2.  **[1_sync_vs_async](./1_sync_vs_async)**: Tại sao chúng ta cần một mô hình mới để xử lý bất đồng bộ? Callback -> Promise -> Stream.
3.  **[2_pull_vs_push](./2_pull_vs_push)**: Hiểu về cơ chế Push (Đẩy) và Pull (Kéo). Đây là nền tảng của Observer Pattern.
4.  **[3_observable_internals](./3_observable_internals)**: Tự xây dựng một Observable đơn giản từ đầu để hiểu "bên dưới nắp capo" nó hoạt động như thế nào.

## Mục tiêu
Sau chương này, bạn sẽ hiểu được **tại sao** chúng ta cần RxJS và **cơ chế hoạt động** của nó, thay vì chỉ biết cách sử dụng API.

## Cài đặt môi trường

Toàn bộ ví dụ trong khóa học dùng **RxJS 7.x** (phiên bản ổn định mới nhất: `7.8.2`, phát hành tháng 2/2025). Lưu ý: RxJS 9 hiện đang ở giai đoạn beta (`9.0.0-beta.1`, 10/2026) nhưng **chưa dùng cho production**, vì vậy toàn bộ cú pháp dưới đây theo chuẩn RxJS 7.x. Xem bảng phiên bản đầy đủ ở [README gốc](../README.md).

```bash
npm install rxjs@7.8.2
```

Import theo chuẩn pipeable operators của RxJS 7:

```javascript
import { of, map, filter } from 'rxjs';
// Lưu ý: RxJS 6+ dùng "pipeable operators" thay vì method chains kiểu .map()
// Trước RxJS 6:  observable.map(x => x + 1)
// RxJS 7 hiện tại:
import { of, map, filter } from 'rxjs';

of(1, 2, 3, 4)
  .pipe(
    filter(n => n % 2 === 0),
    map(n => n * 10)
  )
  .subscribe(console.log);
// 20, 40
```

Tài liệu chính thức: <https://rxjs.dev> — API reference đầy đủ kèm marble diagram cho từng operator.

## Bức tranh tổng thể của khóa học

```
1_concepts    → TẠI SAO (tư duy, mô hình push/pull, Observable hoạt động ra sao)
2_operators   → CÁCH DÙNG (toàn bộ operator: tạo, biến đổi, lọc, gộp, xử lý lỗi)
3_deep_dives  → CƠ CHẾ SÂU (hot/cold, scheduler, test, memory leak)
4_patterns    → MẪU THỰC HÀNH (state management, polling...)
5_practices   → ỨNG DỤNG THỰC TẾ
```

## Ví dụ mở đầu: cùng một bài toán, 2 cách tư duy

Bài toán: mỗi khi người dùng gõ vào ô tìm kiếm, gọi API (debounce 300ms).

```javascript
// ❌ Tư duy mệnh lệnh: tự quản lý timer, hủy request cũ, lỗi dễ xảy ra
let timerId;
let lastController;
input.addEventListener('input', (e) => {
  clearTimeout(timerId);
  timerId = setTimeout(async () => {
    if (lastController) lastController.abort();
    lastController = new AbortController();
    try {
      const res = await fetch(`/api/search?q=${e.target.value}`, {
        signal: lastController.signal
      });
      render(await res.json());
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  }, 300);
});

// ✅ Tư duy Reactive: mô tả LUỒNG, mọi thứ (debounce, hủy request cũ)
// đều được xử lý bằng operator
import { fromEvent, map, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

fromEvent(searchInput, 'input')
  .pipe(
    map(e => e.target.value.trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q =>
      fetch(`/api/search?q=${q}`).then(r => r.json())
    ),
    catchError(err => of([]))
  )
  .subscribe(renderResults);
```

Hãy đọc kỹ ví dụ thứ hai: **không một biến trạng thái nào**, không `clearTimeout`, không `AbortController` thủ công. Đó chính là sức mạnh của luồng dữ liệu (stream) mà chương này sẽ giải thích từng bước.

## Lộ trình học gợi ý

1. Đọc `0_imperative_vs_reactive` → `1_sync_vs_async` để hiểu động lực.
2. Đọc `2_pull_vs_push` kỹ — đây là nền tảng lý thuyết của toàn bộ RxJS.
3. Làm theo `3_observable_internals` bằng cách tự gõ lại code — đừng chỉ đọc.
4. Sau đó chuyển sang chương 2 (Operators) để thực hành.

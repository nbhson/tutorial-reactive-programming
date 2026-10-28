# Higher-Order Mapping Operators

Nhóm này xử lý các **Higher-Order Observables** (Observable lồng trong Observable). Đây là phần khó nhất nhưng cũng quan trọng nhất của RxJS: **xử lý stream lồng trong stream**.

Khi bạn gọi một API từ một sự kiện (gõ phím → gọi API), mỗi lần gõ tạo ra một Observable mới (API call). Bạn phải quyết định: **làm gì với các Observable con này?** Câu trả lời gọi là chiến lược flattening (làm phẳng), và có đúng 4 chiến lược.

> Tài liệu gốc: <https://rxjs.dev/guide/higher-order-observables> và API docs từng operator tại <https://rxjs.dev/api/operators/switchMap>...

---

## 1. Vì sao cần "làm phẳng"?

```javascript
import { fromEvent, map } from 'rxjs';

// Mỗi keystroke → một Observable của API call
const keystrokes$ = fromEvent(searchInput, 'input').pipe(
  map((e) => `SEARCH REQUEST for "${e.target.value}"`) // chưa gọi API, chỉ mô tả
);
// keystrokes$ phát ra các CHUỖI — không phải kết quả API.
// Muốn nhận KẾT QUẢ, phải "đi vào" từng Observable con và quyết định
// chiến lược: hủy cái cũ? xếp hàng? chạy song song? bỏ qua?
```

`map` cho kết quả `Observable<Observable<Results>>` — hai tầng bọc. Các operator `*Map` làm hai việc: **biến đổi** (như map) và **phẳng hóa** theo một chiến lược.

## 2. Bốn chiến lược làm phẳng

| Operator | Chiến lược | Khi có yêu cầu mới trong khi cái cũ chưa xong | Nguy cơ |
| :--- | :--- | :--- | :--- |
| **switchMap** | Mới nhất thắng | **Hủy** cái cũ (unsubscribe) | Mất kết quả của yêu cầu cũ (nếu vẫn cần) |
| **mergeMap** | Song song | Chạy thêm cái mới, giữ nguyên cái cũ | Không giới hạn độ song song → quá tải; race condition nếu thứ tự quan trọng |
| **concatMap** | Xếp hàng | Cái mới **đợi** cho tới khi cái cũ complete | Yêu cầu dồn ứ nếu inner chậm |
| **exhaustMap** | Bận thì từ chối | **Bỏ qua** cái mới hoàn toàn | Mất yêu cầu mới |

Marble diagrams trực quan (outer phát a rồi b; inner mất 3 frame):

```text
switchMap:   outer ──a────b─────    concatMap:  outer ──a──b──
             inner    ─A─B                      inner  ──A─|
             result ────────C─D      (A xong mới tới B)     ──A───B─

mergeMap:    outer ──a──b──          exhaustMap: outer ──a───b──
             inner  ─A─|             inner   ──A───| (b tới khi đang bận)
             inner   ─B─|            result ──A─────| (b bị bỏ)
             result ─A─B─|
```

---

## 3. Từng operator chi tiết

### 3.1. switchMap — "có mới nới cũ"

Khi outer phát giá trị mới, inner đang chạy bị **unsubscribe ngay lập tức**, và inner mới bắt đầu.

```javascript
import { fromEvent, interval } from 'rxjs';
import { switchMap } from 'rxjs';

const clicks$ = fromEvent(document, 'click');

clicks$.pipe(
  // Mỗi lần click, start một bộ đếm mới.
  // NHƯNG nếu click tiếp, bộ đếm cũ sẽ bị HỦY ngay lập tức.
  switchMap(() => interval(1000))
).subscribe((count) => console.log(count));

// Click 1: 0 → 1 → 2 ...
// Click 2 (tại giây 3): hủy bộ đếm cũ → 0 → 1 ...
```

Quy trình chuẩn của switchMap:

1. Outer phát giá trị (user gõ 'A').
2. `switchMap` subscribe vào inner (gọi API tìm 'A').
3. Outer phát giá trị mới (gõ 'B') trong khi inner cũ chưa xong → inner cũ bị **hủy ngay** (unsubscribe → request bị abort).
4. Inner mới bắt đầu chạy; kết quả của nó là thứ duy nhất chạm tới subscriber.

### Case 1: Search-as-you-type

```javascript
import { fromEvent, of } from 'rxjs';
import {
  map, debounceTime, distinctUntilChanged, switchMap, catchError,
} from 'rxjs';

const searchResults$ = fromEvent(searchInput, 'input').pipe(
  map((e) => e.target.value.trim()),
  debounceTime(300),            // chờ ngừng gõ 300ms
  distinctUntilChanged(),       // bỏ qua nếu giá trị không đổi (vd: copy-paste cùng từ)
  switchMap((query) =>          // query mới → hủy query cũ đang chạy
    fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json())
  ),
  catchError(() => of([]))      // API lỗi → trả kết quả rỗng, không chết stream
);

searchResults$.subscribe(renderResults);
```

Vì sao `switchMap` chứ không phải `mergeMap`? Nếu không hủy request cũ, kết quả trả về **muộn** có thể đè lên kết quả **mới** (race condition) — người dùng thấy kết quả cho từ khóa cũ. `switchMap` cam kết: chỉ kết quả của lần gõ cuối cùng mới được hiển thị.

> Mẹo: giữ cả từ khóa vào kết quả (`switchMap(q => api(q).pipe(map(r => ({ q, r }))))`) để so sánh — kết quả của query cũ về sau sẽ bị hủy trước khi kịp render.

---

### 3.2. mergeMap — "ai đến cũng tiếp, chạy song song"

Giữ nguyên các stream cũ đang chạy và chạy thêm stream mới **song song**. Không hủy ai cả.

```javascript
import { of } from 'rxjs';
import { mergeMap, delay } from 'rxjs';

const source$ = of('Task 1', 'Task 2', 'Task 3');

source$.pipe(
  mergeMap((task) => of(`${task} Done`).pipe(delay(Math.random() * 1000)))
).subscribe(console.log);

// Thứ tự hoàn thành ngẫu nhiên — ai xong trước log trước
```

Có thể giới hạn độ song song: `mergeMap(fn, 3)` — tối đa 3 inner chạy đồng thời, các inner còn lại xếp hàng đợi slot trống. Đây là cách "throttle" mergeMap khi cần.

### Case 2: Auto-save (đồng bộ hóa nhanh nhiều thay đổi)

```javascript
// Tự lưu nháp: mỗi thay đổi form → lưu, KHÔNG chờ lần lưu trước
// vì các lần save độc lập nhau, và lưu đủ mọi thay đổi là quan trọng nhất
import { fromEvent } from 'rxjs';
import { debounceTime, map, mergeMap, catchError } from 'rxjs';

const draftChanges$ = fromEvent(form, 'input').pipe(
  map(() => collectFormData()),
  debounceTime(1000), // người dùng ngừng gõ 1 giây mới save
  mergeMap((draft) =>
    fetch('/api/draft', {
      method: 'POST',
      body: JSON.stringify(draft),
    }).then((r) => r.json())
  ),
  catchError(() => of({ saved: false }))
);

draftChanges$.subscribe((res) => updateSaveIndicator(res.saved));
```

Vì sao không `switchMap`? Vì nếu lần save 1 chưa xong mà user gõ tiếp, `switchMap` sẽ **hủy request save giữa chừng** — dữ liệu nháp có thể mất. Với auto-save, mỗi lần save đều đáng giá → `mergeMap`. (Nếu muốn "luôn lưu đúng lần cuối theo thứ tự" thì dùng `concatMap` — xem Case 4.)

---

## 3. concatMap — xếp hàng tuần tự

Khi có giá trị mới, nếu stream cũ chưa chạy xong, giá trị mới **xếp hàng chờ**. Khi nào inner cũ complete thì inner mới mới được chạy.

```javascript
import { of } from 'rxjs';
import { concatMap, delay } from 'rxjs';

const source$ = of('Step 1', 'Step 2', 'Step 3');

source$.pipe(
  // Bắt buộc Step 1 xong (sau 1s) mới tới Step 2...
  concatMap((step) => of(`${step} Done`).pipe(delay(1000)))
).subscribe(console.log);

// (sau 1s) "Step 1 Done"
// (sau 2s) "Step 2 Done"
// (sau 3s) "Step 3 Done"
```

> `concatMap` = `mergeMap` + `concatAll`. Nó **không bao giờ hủy** yêu cầu nào — chỉ có thể chậm dần nếu inner chậm. Đây là operator duy nhất bảo đảm **thứ tự xử lý = thứ tự yêu cầu**.

### Case 3: Upload queue

```javascript
// Upload nhiều file NHƯNG lần lượt — server chỉ nhận 1 request upload/lúc,
// và thứ tự file phải đúng thứ tự người dùng chọn
import { from, fromEvent } from 'rxjs';
import { concatMap, map, scan } from 'rxjs';

const uploadQueue$ = from(fileInputElement.files).pipe(
  concatMap((file, index) =>
    uploadFile(file).pipe(map((res) => ({ file, index, url: res.url })))
  ),
  scan((uploaded, item) => {
    uploaded.push({ index: item.index, name: item.file.name });
    return uploaded;
  }, [] as Array<{ index: number; name: string }>)
);

uploadQueue$.subscribe((done) => renderProgress(done.length, totalFiles));
// File 2 KHÔNG bắt đầu cho tới khi file 1 complete.
// Nếu dùng mergeMap: file 5 xong trước file 3 → thứ tự rối, server-side xử lý sai thứ tự.
```

---

## 4. exhaustMap — bận thì bỏ qua

Khi một inner đang chạy, mọi outer giá trị mới **bị bỏ qua hoàn toàn**. Chỉ khi inner hiện tại xong, yêu cầu mới tiếp theo mới được nhận.

```javascript
import { fromEvent, interval } from 'rxjs';
import { exhaustMap, take } from 'rxjs';

fromEvent(document, 'click').pipe(
  // Khi click, đếm 0→4 (mất 5s).
  // Trong 5s này, mọi click khác đều bị LƠ ĐI.
  exhaustMap(() => interval(1000).pipe(take(5)))
).subscribe(console.log);
```

### Case 4: Login / Submit form chống double-click

```javascript
import { fromEvent, of } from 'rxjs';
import { exhaustMap, map, catchError } from 'rxjs';

const loginSubmit$ = fromEvent(loginButton, 'click').pipe(
  exhaustMap(() =>                       // đang trong request → mọi click tiếp theo bị bỏ qua
    fetch('/api/login', { method: 'POST', body: JSON.stringify(credentials) })
      .then((r) => r.json())
  ),
  map((res) => ({ ok: true, user: res })),
  catchError(() => of({ ok: false }))
);

loginSubmit$.subscribe((res) => (res.ok ? redirect() : showInlineError()));
```

So sánh với cách imperatif: bạn phải tự quản lý cờ `isSubmitting` (set true/false ở đủ nhánh success/error), nhớ tắt cờ khi exception. `exhaustMap` làm điều đó bằng đúng một dòng.

---

## 4. Ví dụ tổng hợp cả bốn chiến lược trên cùng một yêu cầu

Đặt bài toán: gửi các hành động "lưu bài viết" từ editor.

| Chiến lược | Code | Hệ quả |
| --- | --- | --- |
| `switchMap` | `saves$.pipe(switchMap((d) => save(d)))` | Chỉ lần lưu CUỐI được đảm bảo; lần trước bị hủy giữa chừng — **nguy hiểm cho write** |
| `mergeMap` | chạy song song, có thể 2 request lưu chồng lấn, thứ tự đến server không đảm bảo | Race condition: bản lưu cũ có thể ghi đè bản mới |
| `concatMap` | lưu lần lượt theo đúng thứ tự gõ | An toàn cho dữ liệu, nhưng nhanh dồn ứ nếu gõ liên tục |
| `exhaustMap` | bỏ qua các lần lưu khi đang lưu một lần | Có thể bỏ sót nội dung thay đổi gần nhất |

**Chọn thế nào:** nếu **kết quả cuối cùng đúng nhất là điều kiện** (search, filter, preview) → `switchMap`. Nếu **mỗi yêu cầu đều phải được thực thi và đúng thứ tự** → `concatMap`. Nếu các tác vụ độc lập và muốn tốc độ → `mergeMap` (có thể thêm `concurrent` limit). Nếu muốn **đơn giản nhất: cấm spam** → `exhaustMap`.

## 5. Tóm tắt so sánh

| Operator | Chiến lược | Hành động khi có cái mới | Thích hợp cho |
| :--- | :--- | :--- | :--- |
| **switchMap** | Mới nhất thắng | Hủy cái cũ | Search, preview, read API |
| **mergeMap** | Song song | Chạy thêm cái mới | Chat, tải nhiều ảnh, fire-and-forget |
| **concatMap** | Tuần tự | Xếp hàng chờ | Save system, upload có thứ tự |
| **exhaustMap** | Một mình một ngựa | Bỏ qua cái mới | Login button, submit form |

## 6. Quy tắc chọn trong 10 giây

1. Chỉ quan tâm **kết quả mới nhất**? → `switchMap`
2. Cần **tất cả** kết quả, không quan tâm thứ tự? → `mergeMap` (thêm giới hạn nếu lo quá tải)
3. Cần **thứ tự** được bảo toàn? → `concatMap`
4. Không được chạy hai lần cùng lúc? → `exhaustMap`

> Ngoài bốn operator này còn có `switchMapTo`, `mergeMapTo`, `concatMapTo` (bản "To" — inner giống nhau cho mọi giá trị) và `expand` (đệ quy). Các bản `*To` ít dùng, hành vi tương ứng y như bản gốc nhưng không nhận giá trị của outer.

## 7. Cạm bẫy thường gặp

### 7.1. Đặt `catchError` sai vị trí — chết cả luồng chính

```javascript
// ❌ catchError BÊN TRONG switchMap: khi API lỗi, inner error →
// lỗi chạm subscriber và luồng ngoài không thể nhận event mới nữa
outer$.pipe(
  switchMap((q) => api(q).pipe(catchError(() => EMPTY)))
);
// ✅ đúng mục đích trên là EMPTY giữ luồng sống — nhưng nếu quên catchError,
// một API lỗi duy nhất sẽ kill switchMap và cả pipeline
```

Nguyên tắc nhớ: lỗi từ inner **không tự động được nuốt**. Nếu bạn muốn "một request fail không sao, chờ request sau", `catchError` phải nằm trong inner; nếu muốn "API fail thì chuyển toàn bộ app sang màn hình lỗi", `catchError` nằm ngoài.

### 7.2. `mergeMap` không giới hạn — quá tải server

```javascript
// ❌ 1000 item vào cùng lúc → 1000 request đồng thời
of(...Array(1000).keys()).pipe(mergeMap((id) => fetchItem(id)));

// ✅ chỉ 5 request đồng thời, các request còn lại xếp hàng chờ slot
of(...Array(1000).keys()).pipe(mergeMap((id) => fetchItem(id), 5));
```

Tham số thứ hai của `mergeMap` là **concurrent limit** — một trong những chi tiết ít người biết nhưng cực kỳ đắt giá.

### 7.3. Nhầm `exhaustMap` với "chống double-submit" hoàn hảo

`exhaustMap` bỏ qua yêu cầu mới **khi inner đang chạy** — nhưng ngay khi inner complete, yêu cầu tiếp theo được nhận lại. Nếu nghiệp vụ yêu cầu "một lần submit duy nhất vĩnh viễn" (ví dụ nút "đăng ký dự thi"), cần thêm `take(1)`/`first()` hoặc vô hiệu hóa nút qua state — `exhaustMap` chỉ chặn **trong lúc** đang xử lý.

### 7.4. Quên inner phải complete để `concatMap` tiến

```javascript
// ❌ concatMap với inner KHÔNG BAO GIỜ complete:
// giá trị thứ hai của outer bị kẹt mãi — luồng trông "đứng hình"
concatMap(() => interval(1000)) // interval không bao giờ complete!
```

`concatMap` chờ inner **complete**, không phải chỉ "phát xong một giá trị". Dùng inner có điểm dừng: `interval(1000).pipe(take(3))`, `http(...)`, `of(...)`, hoặc `takeUntil(...)`.

## 8. Khi nào KHÔNG cần làm phẳng?

Không phải mọi "sự kiện → tác vụ" đều cần `*Map`. Nếu inner chỉ là một **giá trị đồng bộ**, `map` là đủ:

```javascript
// ❌ thừa thãi: switchMap cho biến đổi đồng bộ
input$.pipe(switchMap((v) => of(v.toUpperCase())));

// ✅ map đơn giản hơn và không tạo thêm tầng bọc
input$.pipe(map((v) => v.toUpperCase()));
```

Dùng `*Map` khi và chỉ khi inner là **bất đồng bộ hoặc có thời gian sống** (request, timer, event stream). Thêm một tầng `*Map` thừa = thêm một cơ chế hủy/xếp hàng mà bạn không cần — khó debug hơn mà không thêm giá trị.

## 9. Test các chiến lược mapping bằng TestScheduler

Cách nhanh nhất để "nhìn thấy" khác biệt: viết test bằng marble (chi tiết tại [3_deep_dives/5_testing](../../3_deep_dives/5_testing)):

```typescript
import { TestScheduler } from 'rxjs/testing';
import { concatMap, of } from 'rxjs';

it('concatMap xếp hàng: inner sau KHÔNG bắt đầu trước inner trước', () => {
  const testScheduler = new TestScheduler((a, e) => expect(a).toEqual(e));
  testScheduler.run(({ cold, expectObservable }) => {
    const outer = cold('-a-b|');
    const inner = cold('--x|');
    // inner của b phải đợi inner của a complete
    const expected = '-a-(x)-|'; // ...phẳng hóa tuần tự
    expectObservable(outer.pipe(concatMap(() => inner))).toBe(expected);
  });
});
```

Thay `concatMap` bằng `mergeMap`/`switchMap`/`exhaustMap` trong chính test đó và xem `expected` đổi thế nào — đây là bài tập nhỏ để "cảm" được bốn chiến lược, không cần đoán bằng trí nhớ.

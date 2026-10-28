# Bản đồ Operators — Tổng quan chương 2

Chương 1 trả lời "Observable là gì". Chương này trả lời "làm gì với Observable" — và câu trả lời gần như luôn là: **operator**.

> Lưu ý: phần lý thuyết nền (Observable, Observer, Subscription, cơ chế next/error/complete) đã được trình bày đầy đủ ở [1_concepts](../../1_concepts). Bài này tập trung vào **bản đồ của các operator** — chia nhóm, marble diagram, và bảng tra cứu nhanh.
>
> Tài liệu gốc: <https://rxjs.dev/guide/operators> — trong đó ghi rõ operator chia làm 2 loại: **Pipeable Operators** (dùng trong `.pipe()`) và **Creation Operators** (hàm đứng độc lập tạo Observable).

---

## 1. Hai loại operator

**Creation Operators** — hàm độc lập, tạo Observable mới từ không khí hoặc từ nguồn khác:

```typescript
import { of, from, fromEvent, interval, timer } from 'rxjs';

of(1, 2, 3);            // tạo từ các giá trị có sẵn
from([1, 2, 3]);        // tạo từ Array / Iterable / Promise
fromEvent(document, 'click'); // từ DOM event
interval(1000);         // từ thời gian
timer(3000, 1000);      // chờ 3s rồi tick mỗi 1s
```

**Pipeable Operators** — hàm nhận Observable vào, trả Observable mới ra (pure — không đổi Observable gốc):

```typescript
import { of, map, filter } from 'rxjs';

of(1, 2, 3, 4)
  .pipe(
    filter((n) => n % 2 === 0), // 2, 4
    map((n) => n * 10)          // 20, 40
  )
  .subscribe(console.log);
```

Mỗi operator trả về một Observable **mới** — Observable ban đầu không bị thay đổi. Đó là tính pure, và đó là lý do bạn có thể tái sử dụng/ghép chúng tự do.

---

## 2. Bản đồ 8 nhóm operator

```
                    Observable nguồn
                          │
    ┌─────────┬─────────┼─────────┬─────────┬─────────┬─────────┐
    │         │         │         │         │         │         │
 CREATION  TRANSFORM  FILTER   COMBINE   ERROR    UTILITY  HIGHER-ORDER
 (tạo mới) (biến đổi) (lọc)   (gộp 2+)  (phục hồi)(phụ,    (stream trong
    │         │         │         │         │     tap,..)   stream)
   of       map      filter  combineLatest catchError tap    switchMap
   from     scan     take*   merge         retry*     delay  mergeMap
   fromEvent buffer* debounceTime concat     throwIf-   finalize concatMap
   interval pairwise distinct*  zip/forkJoin Empty    audit   exhaustMap
   timer    groupBy  throttle* windowToggle iif       share   ...
```

Thứ tự đọc theo file trong thư mục này:

| # | Bài | Nhóm |
| --- | --- | --- |
| 1 | [1_create-operator](../1_create-operator) | Creation |
| 2 | [2_transformation-operator](../2_transformation-operator) | Transformation |
| 3 | [3_filtering](../3_filtering) | Filtering |
| 4 | [4_timer](../4_timer) | Thời gian |
| 5 | [5_combination](../5_combination) | Combination |
| 6 | [6_error-handling](../6_error-handling) | Error & Conditional |
| 7 | [7_higher-order-observable](../7_higher-order-observable) | Higher-order Mapping |
| 8 | [8_utility-operators](../8_utility-operators) | Utility |
| 9 | [9_subjects-and-multicasting](../9_subjects-and-multicasting) | Subjects & Multicasting |

---

## 3. Marble diagram cho từng nhóm

Ký hiệu chuẩn: mỗi dòng là thời gian chạy từ trái sang phải; `a b c` là giá trị emit; `|` là complete; `#` là error.

### 3.1 Transformation — biến đổi từng giá trị

```text
map(x => x * 10):
s:      ──a──b──c──|          scan((acc,x)=>acc+x):
t:      ──A──B──C──|          s:      ──a──b──c──|
                               t:      ──a──ab─abc|
(a=10a, B=10b, C=10c)
```

`map` biến mỗi giá trị độc lập; `scan` mang theo "tích lũy" — giống `reduce` nhưng xuất kết quả **mỗi bước** chứ không chỉ cuối cùng.

### 3.2 Filtering — chọn lọc giá trị

```text
filter(x => x > 2):             take(2):
s:  ──a──b──c──d──|             s:  ──a──b──c──d──|
t:  ──────b──c──d──|            t:  ──a──b──|
(x=3,4,...)                     lấy 2 cái đầu rồi complete

debounceTime(3):                throttleTime(3):
s:  ──a──b──c──────|            s:  ──a──b──c──────|
t:  ─────────c─────|            t:  ──a─────c──────|
(chỉ giữ cái cuối sau           (chỉ giữ cái đầu mỗi
khoảng lặng 3 frame)            cửa sổ 3 frame)
```

Ghi nhớ nhanh: `debounceTime` = "chờ cho yên tĩnh rồi mới hành động" (dùng cho search-as-you-type); `throttleTime` = "hành động ngay, rồi im lặng một khoảng" (dùng cho scroll/resize).

### 3.3 Combination — gộp nhiều stream

```text
merge:                          concat:
s1: ──a──b──|                   s1: ──a──b──|
s2: ─────c──d──|                s2: ─────c──d──|
t:  ──a──b─c──d──|              t:  ──a──b────c──d──|
(xen kẽ, ai đến trước phát      (đợi s1 xong HẾT rồi mới
trước)                          tới s2)

combineLatest:                  zip:
s1: ──a──b──────|               s1: ──a──b──|
s2: ────1───2──3|               s2: ──1──2──3──|
t:  ────a1─b1─b2|               t:  ──a1─b2──|
(đợi cả hai có giá trị          ghép cặp theo CHỈ SỐ —
đầu tiên, sau đó mỗi thay       bên nào hết hàng thì hết)
đổi đều phát cặp mới nhất

forkJoin:
s1: ──a──b──|
s2: ─────c──d──|
t:  ──────────(bd)|
(đợi TẤT CẢ complete, phát đúng giá trị CUỐI của từng stream)
```

Bẫy lớn nhất: `combineLatest` **không phát gì** cho đến khi mọi nguồn đều đã emit ít nhất một giá trị. Nếu một nguồn chưa bao giờ phát, kết quả im lặng — hay dùng `startWith` cho nguồn có thể trống.

### 3.4 Error handling — phục hồi luồng

```text
catchError(() => of('fallback')):
s:  ──a──b──#
t:  ──a──b──(f|)      (lỗi thay bằng fallback rồi complete)

retry(1):
s:  ──a──#
t:  ──a──a──#         (resubscribe từ đầu; hết số lần thì lỗi ra ngoài)

throwIfEmpty(() => new Error('empty')):
s:  ────|
t:  ────#             (complete mà chưa phát gì → thành error)
```

Nguyên tắc: lỗi làm stream **chết hẳn** — sau `error` không còn giá trị nào cả. `catchError`/`retry` là cách duy nhất để luồng sống tiếp.

### 3.5 Higher-order mapping — stream trong stream

```text
switchMap (có mới nới cũ):
outer:  ──a────b─────|
inner:    ────A──B        (a -> inner chưa xong)
t:      ──────C──D──|      (b tới -> hủy inner của a, inner của b phát)

concatMap (xếp hàng):
outer:  ──a──b──|
inner:    ──A─|            (A mất 3 frame)
              ──B─|        (B phải ĐỢI A xong)
t:      ────A───B──|

mergeMap (song song):
outer:  ──a──b──|
inner:    ──A─|
            ──B─|
t:      ────A─B─|          (A, B chạy đồng thời)

exhaustMap (bận thì bỏ qua):
outer:  ──a───b──|
inner:    ────A──|
t:      ───────A──|         (b tới khi a đang chạy → b bị BỎ)
```

Chi tiết từng case thực tế: [7_higher-order-observable](../7_higher-order-observable).

### 3.6 Utility — phụ trợ

```text
tap(x => log(x)):
s:  ──a──b──|          (tap KHÔNG thay đổi gì — chỉ nhìn trộm)
t:  ──a──b──|

delay(2):
s:  ──a──b──|
t:  ─────a──b──|       (toàn bộ timeline dịch phải)

finalize(() => cleanup()):
s:  ──a──b──#
t:  ──a──b──#          (cleanup chạy DÙ complete hay error)
```

---

## 4. Bảng tra cứu nhanh

### Tạo (Creation)

| Operator | Mục đích |
| --- | --- |
| `of(a, b, c)` | Emit lần lượt các giá trị cho trước rồi complete |
| `from(iterable\|promise)` | Chuyển Array/Promise/Iterable thành Observable |
| `fromEvent(el, 'click')` | Đóng gói DOM event |
| `interval(ms)` | Tick số 0,1,2... mỗi ms |
| `timer(ms)` | Emit 1 lần sau ms; `timer(ms, period)` lặp |
| `defer(() => obs)` | Tạo Observable LÚC subscribe (lazy) |
| `throwError(() => err)` | Observable lỗi ngay |
| `EMPTY`, `NEVER` | Không phát gì + complete / không phát gì mãi |

### Biến đổi (Transformation)

| Operator | Mục đích | Ghi nhớ |
| --- | --- | --- |
| `map(fn)` | Biến từng giá trị | Giống Array.map |
| `scan(fn, seed)` | Tích lũy chạy dần | State theo thời gian |
| `buffer(obs)`, `bufferTime`, `bufferCount` | Gom nhóm giá trị | Batch request, gom log |
| `pairwise()` | Phát cặp [trước, sau] | So sánh giá trị liền kề |
| `groupBy(fn)` | Chia stream theo key | — |
| `expand(fn)` | Đệ quy: phát rồi biến thành nguồn tiếp | — |

### Lọc (Filtering)

| Operator | Mục đích | Ghi nhớ |
| --- | --- | --- |
| `filter(fn)` | Giữ giá trị thoả điều kiện | Giống Array.filter |
| `take(n)` / `takeLast(n)` | Lấy n giá trị đầu / cuối | take(1) ≈ "chỉ lần đầu" |
| `first()` / `last()` | Giá trị đầu / cuối | Error nếu trống |
| `takeUntil(other$)` | Nhận cho tới khi `other` phát | Công cụ hủy theo vòng đời |
| `takeWhile(fn)` | Nhận cho tới khi fn sai | |
| `skip(n)`, `skipUntil`, `skipWhile` | Bỏ qua n giá trị đầu | |
| `debounceTime(ms)` | Chờ im lặng ms rồi phát giá trị cuối | Search input |
| `throttleTime(ms)` | Phát rồi im lặng ms | Scroll/resize |
| `auditTime(ms)` | Giống throttle nhưng phát giá trị MỚI NHẤT trong cửa sổ | |
| `distinctUntilChanged(fn?)` | Bỏ qua giá trị trùng giá trị liền trước | |
| `first(fn?)`, `single`, `elementAt(i)` | Chọn theo vị trí | |
| `ignoreElements()` | Bỏ hết giá trị, chỉ quan tâm complete/error | |

### Thời gian

| Operator | Mục đích |
| --- | --- |
| `delay(ms)` | Dịch toàn bộ timeline sang phải |
| `delayWhen(fn)` | Trì hoãn theo điều kiện từng giá trị |
| `timeout(ms)` | Error nếu không có giá trị trong ms |
| `timeInterval()` | Phát khoảng cách thời gian giữa các emit |
| `timestamp()` | Gắn timestamp cho từng giá trị |

### Gộp (Combination)

| Operator | Mục đích | Cẩn thận |
| --- | --- | --- |
| `merge(a, b)` | Xen kẽ cả hai | Không đợi |
| `concat(a, b)` | Tuần tự: a xong mới b | a phải complete |
| `combineLatest([a, b])` | Phát khi BẤT KỲ nguồn đổi | Cần cả hai đã emit ≥1 |
| `zip(a, b)` | Ghép theo chỉ số | Bên trễ hơn quyết định nhịp |
| `withLatestFrom(b)` | Giá trị A kèm giá trị mới nhất của B | A điều khiển nhịp |
| `forkJoin([a, b])` | Chờ tất cả complete, lấy giá trị cuối | Source không complete → forkJoin không phát |
| `race(a, b)` | Chỉ stream phát trước thắng | |

### Lỗi & điều kiện

| Operator | Mục đích |
| --- | --- |
| `catchError(fn)` | Bắt lỗi, thay bằng fallback stream |
| `retry(n)` / `retry({delay})` | Resubscribe; RxJS 7.2+ có delay hỗ trợ backoff |
| `throwIfEmpty(fn)` | Complete rỗng → error |
| `defaultIfEmpty(v)` | Complete rỗng → phát v |
| `every(fn)` | Mọi giá trị thoả điều kiện? |
| `iif(fn, a, b)` | Rẽ nhánh LÚC subscribe |

> Lưu ý: `retryWhen` **deprecated từ RxJS 7.2** — dùng `retry({ delay })`.

### Higher-order mapping

| Operator | Chiến lược | Case điển hình |
| --- | --- | --- |
| `switchMap` | Hủy cái cũ, chỉ giữ mới nhất | Search-as-you-type, auto-save |
| `mergeMap` | Song song không giới hạn | Tải nhiều ảnh, fire-and-forget |
| `concatMap` | Xếp hàng tuần tự | Upload queue, save từng bước |
| `exhaustMap` | Bận thì bỏ qua yêu cầu mới | Nút login/submit chống double-click |

### Utility & Multicasting

| Operator | Mục đích |
| --- | --- |
| `tap(fn)` | Side effect (log, set state) không đổi luồng |
| `finalize(fn)` | Chạy khi complete/error/unsubscribe — tắt spinner |
| `share()` | Multicast không cache |
| `shareReplay({bufferSize, refCount})` | Multicast kèm cache |
| `subscribeOn(scheduler)` | Scheduler cho thời điểm subscribe |
| `observeOn(scheduler)` | Scheduler cho thời điểm phát giá trị |

---

## 5. Quy tắc giữ pipe dễ đọc

1. **Thứ tự trong `pipe` là ý nghĩa.** `debounceTime(300)` đứng **trước** `switchMap` nghĩa là "chờ người dùng ngừng gõ rồi mới gọi API"; đứng **sau** thì debounce áp dụng lên kết quả — hai vị trí, hai hành vi khác nhau.
2. **`catchError` đặt ở đúng tầng.** Đặt trước `switchMap` để lỗi của inner không chết cả stream; đặt sau để bắt mọi lỗi của pipeline.
3. **`shareReplay`/`share` gần cuối pipe**, ngay trước khi trả stream ra cho nhiều nơi dùng.
4. **`takeUntil(destroy$)` đặt CUỐI cùng** — đặt trước switchMap sẽ không hủy được inner đang chạy.

Đọc tiếp: [1_create-operator](../1_create-operator).

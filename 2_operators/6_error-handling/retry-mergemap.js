const { of, merge, throwError, timer } = require('rxjs');
const { mergeMap, retry, map, catchError, delay } = require('rxjs/operators');

// --- CÂU TRẢ LỜI NGẮN GỌN ---
// 1. Tại sao dùng mergeMap?
//    Vì bạn cần "Biến đổi" (Map) giá trị nhận được (VD: ID user) thành một "Hành động" (gọi API).
//    `merge` không làm được bước "Biến đổi" này. `merge` chỉ gộp các dòng chảy có sẵn lại với nhau.

// 2. Nếu dùng merge thì sao?
//    Bạn phải có sẵn các Observable rồi. Bạn không thể lấy giá trị từ dòng chảy A để gọi dòng chảy B bên trong `merge` được.

console.log('--- 1. MERGE MAP + RETRY (Cách dùng đúng phổ biến) ---');
// Kịch bản: Nhận ID -> Gọi API -> Lỗi -> Thử lại
const source$ = of(1); // Phát ra ID: 1

source$.pipe(
    // mergeMap giúp lấy số 1 để giả lập gọi API
    mergeMap(id => {
        console.log(`[MergeMap] Gọi API với ID: ${id}`);
        return throwError('Lỗi Mạng!').pipe(delay(100)); // Giả lập lỗi
    }),
    retry(2) // Thử lại TOÀN BỘ luồng (subscribe lại source$ từ đầu)
).subscribe({
    error: err => console.log('--> Kết thúc với lỗi:', err),
    complete: () => console.log('--> Xong')
});
// Output: Gọi API -> Lỗi -> Gọi API -> Lỗi -> Gọi API -> Lỗi -> Stop


setTimeout(() => {
    console.log('\n--- 2. MERGE (Chỉ gộp, không map được) ---');

    const streamA$ = of('A');
    const streamB$ = throwError('Lỗi B');

    // merge chỉ đơn giản là gộp lại. Nó không biết "A" sinh ra "B"
    merge(streamA$, streamB$).pipe(
        retry(1)
    ).subscribe({
        next: val => console.log('[Merge] Nhận:', val),
        error: err => console.log('[Merge] Lỗi:', err)
    });

    // Output:
    // Nhận A
    // Gặp Lỗi B -> Retry
    // Nhận A (Lại)
    // Gặp Lỗi B (Lại) -> Stop
    // VẤN ĐỀ: StreamB không hề liên quan gì đến dữ liệu của StreamA.
}, 3000);

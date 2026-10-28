const { of, throwError } = require('rxjs');
const { catchError, mergeMap } = require('rxjs/operators');

console.log('--- 1. throwError: KẺ GÂY RA LỖI (Producer) ---');
// throwError là một CREATION Operator. Nó tạo ra một Observable chết ngay lập tức với 1 lỗi.
// Giống như `Promise.reject('Lỗi')` hoặc `throw new Error('Lỗi')`

const errorStream$ = throwError(() => '🔥 Lỗi Giả Lập!');

errorStream$.subscribe({
    next: val => console.log('Nhận:', val),
    error: err => console.log('Bắt được lỗi từ throwError:', err)
});


console.log('\n--- 2. catchError: NGƯỜI DỌN DẸP (Consumer/Handler) ---');
// catchError là một PIPEABLE Operator. Nó đứng ở giữa dòng chảy để bắt lỗi từ phía trên.

of('Làm việc...').pipe(
    mergeMap(() => {
        // Giả sử làm gì đó bị lỗi
        return throwError(() => '💥 Lỗi Mạng!');
    }),

    // catchError đứng ở đây để chặn lỗi
    catchError(err => {
        console.log(`[catchError] Đã chặn được: "${err}"`);

        // QUYẾT ĐỊNH SỐ PHẬN DÒNG CHẢY:

        // Case A: Trả về dòng chảy mới (Fallback / Recovery)
        return of('✅ Dùng Data Cache thay thế');

        // Case B: Ném lại lỗi (Re-throw) - nếu muốn báo lên trên
        // return throwError(() => 'Lỗi nghiêm trọng không cứu được');
    })
).subscribe({
    next: val => console.log('Subscriber nhận được:', val),
    error: err => console.log('Subscriber nhận lỗi:', err)
});

// KẾT QUẢ:
// Subscriber sẽ nhận được '✅ Dùng Data Cache thay thế' và KHÔNG HỀ BIẾT là có lỗi mạng xảy ra.
// Stream hoàn thành (Complete) một cách êm đẹp.

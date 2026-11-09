# WordQuest

Ứng dụng demo FER202 để tra cứu từ vựng tiếng Anh, ôn flashcard và làm quiz. Dự án dùng React, React Router, React Bootstrap, Axios và JSON Server.

## Chạy ở máy local

Mở hai terminal trong thư mục `ass`. Dùng Node.js 22 trở lên.

```sh
npm ci
npm run server
```

Trong terminal thứ hai:

```sh
npm start
```

Mở [WordQuest](http://localhost:3000). JSON Server đọc và ghi `db.json` ở cổng 3001. Chạy `npm run build` để tạo bản production trong `build/`. Có thể đặt `REACT_APP_API_URL` trước khi chạy React nếu dùng địa chỉ API khác.

## Tài khoản demo

Trong cấu hình demo ban đầu, mật khẩu mẫu là `wordquest-demo`. Nếu bạn đã sửa tài khoản, dùng email và mật khẩu hiện tại trong `accounts` của `db.json`.

| Email | Vai trò | Hồ sơ |
| --- | --- | --- |
| `teacher@wordquest.test` | Giảng viên | Giảng viên demo |
| `linh@wordquest.test` | Người học | Linh |
| `minh@wordquest.test` | Người học | Minh |
| `an@wordquest.test` | Người học | An |
| `nam@wordquest.test` | Người học | Nam (ngừng hoạt động) |

Xác thực chỉ phục vụ demo. Route guard ở React không bảo vệ API JSON Server. API cho phép đọc và sửa dữ liệu trực tiếp, bao gồm tài khoản và đáp án mẫu. Chỉ dùng mật khẩu và dữ liệu giả. Phiên trong `localStorage` gồm ID, vai trò, tên hiển thị và `learnerId` nếu có.

## Route chính

| Route | Nội dung |
| --- | --- |
| `/login` | Đăng nhập |
| `/words`, `/words/:id` | Tra cứu và chi tiết từ |
| `/words/new`, `/words/:id/edit`, `/topics` | Giảng viên quản lý từ và chủ đề |
| `/decks`, `/decks/:id` | Danh sách bộ và thành viên. Giảng viên có thể thêm, sửa, xóa thẻ hoặc xóa bộ tại trang chi tiết |
| `/decks/new`, `/decks/:id/edit` | Giảng viên chỉnh tên, mô tả, thẻ từ ngân hàng và thành viên |
| `/decks/:id/review`, `/decks/:id/quiz` | Người học ôn thẻ hoặc làm quiz tự luyện |
| `/questions`, `/questions/new`, `/questions/:id/edit` | Ngân hàng câu hỏi của giảng viên |
| `/assignments` | Danh sách bài giao theo vai trò |
| `/assignments/new`, `/assignments/:id`, `/assignments/:id/edit` | Giảng viên soạn, giao, đóng bài và xem điểm |
| `/assignments/:id/quiz` | Người nhận làm bài hoặc xem kết quả của mình |
| `/progress`, `/progress/quiz/:id` | Tiến độ và lịch sử quiz cá nhân |

## Thử hai luồng

Để giữ dữ liệu mẫu sạch, chạy JSON Server với bản sao thay cho `npm run server` trong lúc thử. Trong PowerShell:

```powershell
$wordQuestDemoDb = Join-Path $env:TEMP "wordquest-demo-db.json"
Copy-Item db.json $wordQuestDemoDb
npx --no-install json-server $wordQuestDemoDb --port 3001
```

1. Đăng nhập giảng viên. Tại **Từ vựng**, thêm từ vào chủ đề **Food and Drinks**. Tạo bộ chứa từ đó, sửa bộ và đặt Linh thành **Đang tham gia**. Tạo câu hỏi với bốn lựa chọn và một đáp án đúng. Tạo bài giao từ bộ này, chọn câu hỏi, Linh và hạn tương lai. Có thể **Lưu nháp**, mở lại rồi **Giao bài**. Mở chi tiết để xem Linh chưa nộp. Sau khi Linh nộp ở bước 2, quay lại để xem điểm và kiểm tra bộ, câu hỏi, người nhận đã bị khóa khi sửa bài.
2. Đăng nhập Linh. Trong dữ liệu mẫu ban đầu, mục **Bài giao** có bài Food chưa nộp, bài Travel đã nộp và bài vừa giao ở bước 1. Bài Education của Minh không xuất hiện. Mở bộ Food hoặc bộ mới đã tham gia, bấm vào thẻ để lật và thử đổi đánh giá. Mở bài chưa nộp, thử nộp khi còn thiếu đáp án, trả lời đủ rồi nộp. Tải lại URL quiz để thấy kết quả đã lưu và không có nút nộp. Vào **Tiến độ** để kiểm tra lịch sử và lọc lượt ôn. Thử mở `/questions/new` bằng tài khoản Linh để kiểm tra chuyển hướng. Đăng xuất rồi mở `/progress` để kiểm tra yêu cầu đăng nhập.

Hạn bài mẫu là `2035-12-31T16:59:00.000Z`, tương ứng 23:59 giờ Việt Nam ngày 31/12/2035. Giảng viên có thể sửa hạn của bài đang mở, hoặc chỉnh `assignments[].dueAt` bằng chuỗi ISO trong bản sao dữ liệu khi tắt JSON Server. Đặt hạn trong quá khứ để thử trạng thái **Quá hạn** và dùng lại bản gốc khi muốn đặt lại demo.

## Thử riêng Flashcard

1. Giảng viên tạo bộ với tên và mô tả, chọn một người học tham gia, rồi vào chi tiết bộ để thêm vài thẻ bằng **Thuật ngữ** và **Định nghĩa**. Có thể tạo bộ rỗng hoặc chọn thẻ từ ngân hàng từ vựng nếu đã chọn chủ đề.
2. Người học mở **Ôn flashcard**. Bấm thẻ để lật, chọn **Chưa học**, **Chưa thuộc** hoặc **Đã thuộc**, rồi dùng **Trước** và **Tiếp** để di chuyển. Ở thẻ cuối, **Kết thúc lượt** cho biết còn bao nhiêu thẻ cần học. **Ôn thẻ cần học** lấy cả thẻ chưa học và chưa thuộc.
3. Thử đánh dấu sao, bật **Chỉ thẻ có sao**, **Trộn thẻ** và **Định nghĩa trước**. **Học lại từ đầu** giữ nguyên thứ tự của lượt và tiến độ đã lưu. Tải lại trang sẽ khôi phục đánh giá và sao, rồi mở lại từ thẻ đầu với tùy chọn mặc định.
4. Giảng viên sửa một thẻ đã học rồi mở lại lượt học để kiểm tra tiến độ vẫn giữ theo ID. Xóa thẻ sẽ xóa tiến độ và sao của thẻ đó. Có thể xóa bộ chưa có bài giao hoặc kết quả quiz. Nếu bộ có nhật ký từ vựng, ứng dụng giữ ID và tên bộ cho lịch sử và xóa thẻ, thành viên cùng tiến độ thẻ.

Chạy `npm test -- --watchAll=false --runInBand` để kiểm tra dữ liệu bộ cũ, tiến độ, thứ tự thẻ và cách tính tỷ lệ.

## Giới hạn demo

- Kiểm tra tham chiếu và chống ghi trùng chạy trong ứng dụng. Các tab cùng origin dùng Web Locks nếu trình duyệt hỗ trợ. Thiết bị hoặc origin khác có thể ghi đồng thời vì JSON Server không có ràng buộc duy nhất hay giao dịch.
- Nếu đã ghi nhật ký ôn nhưng cập nhật tiến độ lỗi, nút **Thử lưu lại** dùng lại mã lượt ôn. Trang tiến độ cũng tính từ nhật ký đã lưu và lần ôn thành công tiếp theo của từ đó đồng bộ bản ghi tiến độ.
- Trình duyệt dùng giờ trên thiết bị để hiển thị ngày, lọc nhật ký và kiểm tra hạn nộp.

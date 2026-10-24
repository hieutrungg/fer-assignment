# Dữ liệu WordQuest

Phiên bản đầu dành cho **một người học**, chưa có tài khoản hoặc phân quyền. Flashcard dùng trực tiếp dữ liệu `words`, không cần bảng riêng. Đây là dữ liệu mẫu để học React và JSON Server; không phải cấu trúc đề thi PE chính thức.

## Chạy dự án

Mở terminal trong thư mục `ass`:

```powershell
npm run server
```

Mở terminal thứ hai, cũng trong `ass`:

```powershell
npm start
```

React chạy cổng 3000; API chạy cổng 3001. Dự án đang dùng JSON Server v1 beta, dùng ID kiểu chuỗi và lệnh chạy không cần `--watch`.

## Các collection

| Collection | Mục đích | Trường liên kết |
| --- | --- | --- |
| `topics` | Danh sách chủ đề | `id` |
| `words` | Nội dung từ vựng và flashcard | `topicId` → `topics.id` |
| `questions` | Câu hỏi trắc nghiệm một đáp án đúng | `wordId` → `words.id` |
| `learningProgress` | Trạng thái học và yêu thích từng từ | `wordId` → `words.id` |
| `quizAttempts` | Lịch sử các lần nộp bài | `topicId` → `topics.id`, `answers[].questionId` → `questions.id` |

Các trường tên `...Id` là liên kết do ứng dụng tự quản lý; JSON Server không tự kiểm tra khóa ngoại hoặc xử lý xóa dây chuyền.

## Quy ước để code React

- Tất cả `id`, `topicId`, `wordId`, `questionId` đều là chuỗi, ví dụ `"1"`. Khi tạo mới qua `POST`, bỏ trường `id` để JSON Server sinh ID.
- `word` là từ tiếng Anh; `meaning` là nghĩa tiếng Việt; `phonetic` là phiên âm; `partOfSpeech` là loại từ. `level` nhận `A1`, `A2` hoặc `B1` trong dữ liệu mẫu.
- `imageUrl` và `audioUrl` đang để `""` vì chưa có tài nguyên. Sau này đặt file trong `public/images` và `public/audio`, rồi lưu đường dẫn như `/images/apple.jpg`, `/audio/apple.mp3`. Khi chưa có URL, hiện placeholder ảnh và ẩn nút phát âm. Phiên âm không phải file âm thanh.
- Mỗi từ có tối đa một bản ghi `learningProgress`. Chưa có bản ghi nghĩa là `new`, chưa yêu thích, số lần ôn bằng 0. `status` nhận `new`, `learning`, `mastered`; nút “Đã thuộc” đặt trạng thái `mastered` theo lựa chọn của người học.
- Trước khi lưu tiến độ, tìm bản ghi bằng `wordId`; có rồi thì `PATCH`, chưa có thì `POST`. Chỉ thêm vào yêu thích không đồng nghĩa đã ôn từ. Khi ôn, tăng `reviewCount` và cập nhật `lastReviewedAt` bằng `new Date().toISOString()`.
- Mỗi câu có 4 lựa chọn khác nhau; `correctAnswer` phải trùng đúng một giá trị trong `options`. Dùng `Radio` cho một đáp án; chấm bằng `selectedAnswer === correctAnswer`.
- `quizAttempts.answers` lưu cả nội dung câu hỏi và đáp án tại lúc nộp để lịch sử vẫn đọc được khi sửa câu hỏi gốc. Tính số câu đúng bằng `answers.filter(a => a.selectedAnswer === a.correctAnswer).length`; phần trăm đúng bằng số đúng / số câu × 100, trả 0 nếu không có câu.
- Tiến độ tổng = số từ có trạng thái `mastered` / tổng số từ × 100; trả 0 nếu chưa có từ. Không lưu thêm số tổng này vào database vì có thể tính từ dữ liệu hiện tại.
- Quiz theo chủ đề: lấy `words` của chủ đề, rồi dùng `filter` lấy các `questions` có `wordId` thuộc các từ đó. Khi nộp, lưu một `quizAttempts`; quiz tổng hợp có thể dùng `topicId: null`.
- Khi xóa từ, cần xử lý câu hỏi và tiến độ liên quan trong React. Với phiên bản mới học, nên chặn xóa chủ đề còn từ và chặn xóa từ còn câu hỏi; giữ lịch sử quiz vì đã lưu nội dung tại lúc nộp.

## API để luyện tập

Base URL: `http://localhost:3001`.

| Thao tác | Method và đường dẫn | Kỹ năng |
| --- | --- | --- |
| Lấy chủ đề | `GET /topics` | `useEffect`, Axios, `map` |
| Lấy từ theo chủ đề | `GET /words?topicId=1` | Route params, lọc dữ liệu |
| Chi tiết từ | `GET /words/1` | Trang chi tiết |
| Lọc trình độ | `GET /words?level=A1` | Select, controlled input |
| Tạo từ | `POST /words` | Form, validation |
| Sửa nghĩa | `PATCH /words/1` với `{ "meaning": "quả táo" }` | Cập nhật dữ liệu |
| Xóa từ | `DELETE /words/12` | Xóa và cập nhật state |
| Tìm tiến độ của từ | `GET /learningProgress?wordId=1` | Kết quả là mảng, có thể rỗng |
| Từ yêu thích | `GET /learningProgress?isFavorite=true` | Ghép với `words` bằng `wordId` |
| Lấy câu hỏi | `GET /questions` | `filter`, `includes`, state đáp án |
| Lưu bài quiz | `POST /quizAttempts` | Mảng object, tính điểm |
| Lịch sử mới nhất trước | `GET /quizAttempts?_sort=-completedAt` | Sắp xếp |

Để học tìm kiếm trước, tải `words` rồi dùng `filter` với `word.toLowerCase().includes(keyword.toLowerCase())` trong React. Không cần thêm thư viện quản lý state lúc này.

## Thứ tự triển khai gợi ý

1. Danh sách từ: `Container`, `Row`, `Col`, `Card`, gọi API rồi `map`.
2. Tìm kiếm và lọc: `Form.Control`, `Form.Select`, kết hợp keyword, chủ đề và trình độ.
3. Chi tiết từ: React Router, `useParams`, hiển thị ví dụ và phiên âm.
4. CRUD từ: `Form`, validation trường bắt buộc, `Modal`, `Button`, thông báo lỗi bằng `Alert`.
5. Flashcard: state chỉ số từ hiện tại và trạng thái lật thẻ; sau đó lưu tiến độ bằng API.
6. Quiz: chọn đáp án, nộp bài, tính điểm, lưu lịch sử.
7. Dashboard: số từ đã thuộc, từ yêu thích, lịch sử quiz, `ProgressBar`.

Khi học cùng AI, yêu cầu từng chức năng nhỏ: “Hướng dẫn tôi làm danh sách từ từ API, giải thích useEffect và useState, để tôi tự viết trước rồi review.” Sau mỗi chức năng, tự viết lại một lần không nhìn code và thử cả loading, lỗi API, dữ liệu rỗng, form sai. Đối chiếu format, thư viện và phiên bản JSON Server với đề mẫu hoặc hướng dẫn của giảng viên khi luyện PE.

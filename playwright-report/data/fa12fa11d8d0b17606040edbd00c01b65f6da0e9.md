# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Về trang chủ" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e6]
        - text: Về trang chủ
      - generic [ref=e8]:
        - img [ref=e10]
        - generic [ref=e14]:
          - heading "Đăng nhập" [level=1] [ref=e15]
          - paragraph [ref=e16]: Hỏi - Đáp CNTT
    - generic [ref=e18]:
      - generic [ref=e19]: Invalid email or password
      - generic [ref=e20]:
        - generic [ref=e21]: Email
        - textbox "Email" [ref=e22]:
          - /placeholder: your.email@example.com
          - text: CTI06@cntt.edu.vn
      - generic [ref=e23]:
        - generic [ref=e24]: Mật khẩu
        - textbox "Mật khẩu" [ref=e25]:
          - /placeholder: ••••••••
          - text: "12345678"
      - generic [ref=e27]:
        - checkbox "Ghi nhớ đăng nhập" [ref=e28]
        - generic [ref=e29]: Ghi nhớ đăng nhập
      - button "Đăng nhập" [ref=e30]
    - generic [ref=e32]:
      - img [ref=e33]
      - generic [ref=e35]:
        - paragraph [ref=e36]: Dành cho Sinh viên & CVHT
        - paragraph [ref=e37]: Sử dụng email và mật khẩu đã được cấp để đăng nhập vào hệ thống.
  - button "Open Next.js Dev Tools" [ref=e43] [cursor=pointer]:
    - img [ref=e44]
  - alert [ref=e48]
```
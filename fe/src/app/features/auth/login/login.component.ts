import { Component, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = signal(false);
  private effectRef: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    // Gắn effect để tự động điều hướng hoặc xử lý state
    this.effectRef = effect(() => {
      // Điều hướng nếu đã đăng nhập
      if (this.authService.isAuthenticated()) {
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      }

      // Xử lý disable form khi đang loading thông qua TypeScript
      if (this.authService.isLoading()) {
        this.loginForm.disable({ emitEvent: false });
      } else {
        this.loginForm.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.authService.checkAuth();
  }

  ngOnDestroy(): void {
    this.authService.clearError();
  }

  get isLoading() {
    return this.authService.isLoading();
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // Sử dụng getRawValue để lấy giá trị ngay cả khi form bị disable bởi effect
    const { email, password, rememberMe } = this.loginForm.getRawValue();

    try {
      await this.authService.login({ email, password, rememberMe });
      this.toastr.success('Đăng nhập thành công!', 'Thành công');
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
      setTimeout(() => this.router.navigateByUrl(returnUrl), 300);
    } catch {
      const errMsg = this.authService.error() ?? 'Đăng nhập thất bại';
      this.toastr.error(errMsg, 'Lỗi');
    }
  }
}

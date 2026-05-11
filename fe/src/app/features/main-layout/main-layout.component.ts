import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <div class="shell-right">
        <app-header />
        <main class="shell-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: #0a0f1e;
    }
    .shell-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .shell-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    // If token exists but user data wasn't restored from cookie (e.g. cookie too large,
    // corrupt JSON, or SSR context), silently fetch from backend and re-persist.
    this.authService.tryLoadUser();
  }
}

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
      <app-sidebar #sidebar />
      <div class="shell-right">
        <app-header />
        <main class="shell-content">
          <router-outlet />
        </main>
      </div>
      @if (!sidebar.isCollapsed()) {
        <div class="sidebar-backdrop" (click)="sidebar.toggleCollapse()"></div>
      }
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: #0a0f1e;
      position: relative;
    }
    .shell-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .shell-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .sidebar-backdrop {
      display: none;
    }
    @media (max-width: 768px) {
      .sidebar-backdrop {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 90;
        cursor: pointer;
        animation: fadeIn 0.2s ease-out;
      }
      .shell-right {
        padding-left: 68px;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

interface StatCard {
  label: string;
  gradient: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  statCards: StatCard[] = [
    {
      label: 'Tổng số xe',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
      icon: '🚌',
    },
    {
      label: 'Xe đang hoạt động',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))',
      icon: '✅',
    },
    {
      label: 'Chuyến hôm nay',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.2))',
      icon: '🗺️',
    },
    {
      label: 'Tài xế',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
      icon: '👤',
    },
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {}
}

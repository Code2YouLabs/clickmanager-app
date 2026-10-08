import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TutorialOverlayComponent } from 'src/app/shared/tutorial/tutorial-overlay.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TutorialOverlayComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'Sistema de Gestão para gráficas ClickManager';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.carregarUsuarioCompleto().subscribe({
        error: () => {
          // ignora falhas em contexto público (ex.: landingpage sem token)
        },
      });
    }
  }
}

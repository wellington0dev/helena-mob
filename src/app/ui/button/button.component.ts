import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';

/** Botão custom (glassmorphism). Variantes: primary (accent), glass, ghost. */
@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'glass' | 'ghost' = 'primary';
  @Input() size: 'md' | 'sm' = 'md';
  @Input({ transform: booleanAttribute }) block = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
}

import { ChangeDetectionStrategy, Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Switch custom (glass). Suporta [(ngModel)]. */
@Component({
  selector: 'ui-toggle',
  standalone: true,
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true },
  ],
})
export class ToggleComponent implements ControlValueAccessor {
  on = signal(false);
  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: boolean): void {
    this.on.set(!!v);
  }
  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggle(): void {
    this.on.update((v) => !v);
    this.onChange(this.on());
    this.onTouched();
  }
}

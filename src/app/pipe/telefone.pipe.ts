import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'telefone',
  standalone: true
})
@Injectable({ providedIn: 'root' })
export class TelefonePipe implements PipeTransform {
  transform(value: string | null | undefined, semDdiBrasil = false): string {
    if (!value) return '';

    let cleaned = value.replace(/\D/g, '');
    if (semDdiBrasil && /^55[0-9]{10,11}$/.test(cleaned)) cleaned = cleaned.slice(2);

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); // celular com DDD
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); // fixo com DDD
    } else if (cleaned.length === 9) {
      return cleaned.replace(/(\d{5})(\d{4})/, '$1-$2'); // celular sem DDD
    } else if (cleaned.length === 8) {
      return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2'); // fixo sem DDD
    }

    return value;
  }
}

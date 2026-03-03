import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'getUsername',
  standalone: true
})
export class GetUsernamePipe implements PipeTransform {

  transform(players: any[], id: string): string {
    if (!players || !id) return 'Unknown';
    const player = players.find(p => p.id === id);
    return player ? player.username : 'Unknown';
  }

}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { CounterService } from '../services/counter.service';

type SortOption = 'newest' | 'oldest' | 'nameAsc' | 'valueDesc';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    DatePipe,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class Tab2Page implements OnInit {
  readonly counterService = inject(CounterService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  readonly searchQuery = signal('');
  readonly sortBy = signal<SortOption>('newest');

  readonly totalSum = computed(() => {
    return this.counterService.counters().reduce((sum, item) => sum + item.value, 0);
  });

  // Varianta C: Počet kladných, záporných a nulových hodnot
  readonly valueStats = computed(() => {
    const counters = this.counterService.counters();
    let positive = 0;
    let negative = 0;
    let zero = 0;

    for (const c of counters) {
      if (c.value > 0) {
        positive++;
      } else if (c.value < 0) {
        negative++;
      } else {
        zero++;
      }
    }

    return { positive, negative, zero };
  });

  readonly filteredCounters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    let items = this.counterService.counters();

    if (query) {
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }

    const sort = this.sortBy();
    return [...items].sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'nameAsc') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'valueDesc') {
        return b.value - a.value;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  async ngOnInit(): Promise<void> {
    await this.counterService.initialize();
  }

  async remove(id: string): Promise<void> {
    await this.counterService.remove(id);

    const toast = await this.toastCtrl.create({
      message: 'Záznam byl odstraněn.',
      duration: 2000,
      color: 'dark',
      position: 'bottom',
    });
    await toast.present();
  }

  async clear(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Vymazat celou historii?',
      message: 'Opravdu chcete odstranit všechna počítadla? Tuto akci nelze vzít zpět.',
      buttons: [
        {
          text: 'Zrušit',
          role: 'cancel',
        },
        {
          text: 'Vymazat',
          role: 'destructive',
          handler: async () => {
            await this.counterService.clear();

            const toast = await this.toastCtrl.create({
              message: 'Historie byla vymazána.',
              duration: 2000,
              color: 'warning',
              position: 'bottom',
            });
            await toast.present();
          },
        },
      ],
    });

    await alert.present();
  }
}
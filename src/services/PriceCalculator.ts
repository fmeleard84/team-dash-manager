/**
 * Service de calcul unifié des prix
 * IMPORTANT : Tous les prix sont calculés et affichés À LA MINUTE
 * Seule exception : l'affichage dans les paramètres candidat (tarif journalier)
 */

export class PriceCalculator {
  // Constantes de conversion
  private static readonly MINUTES_PER_DAY = 480; // 8 heures = 480 minutes
  private static readonly MINUTES_PER_HOUR = 60;
  private static readonly HOURS_PER_DAY = 8;

  /**
   * Convertit un tarif journalier en tarif à la minute
   * C'est LA méthode principale utilisée partout dans l'application
   */
  static getDailyToMinuteRate(dailyRate: number): number {
    if (!dailyRate || dailyRate <= 0) return 0;
    return Number((dailyRate / this.MINUTES_PER_DAY).toFixed(2));
  }

  /**
   * Convertit un tarif à la minute en tarif journalier
   * Utilisé UNIQUEMENT dans les paramètres candidat pour l'affichage
   */
  static getMinuteToDailyRate(minuteRate: number): number {
    if (!minuteRate || minuteRate <= 0) return 0;
    return Number((minuteRate * this.MINUTES_PER_DAY).toFixed(2));
  }

  /**
   * Convertit un tarif journalier en tarif horaire
   * Peut être utile pour certains calculs intermédiaires
   */
  static getDailyToHourlyRate(dailyRate: number): number {
    if (!dailyRate || dailyRate <= 0) return 0;
    return Number((dailyRate / this.HOURS_PER_DAY).toFixed(2));
  }

  /**
   * Calcule le coût total d'un projet en fonction de la durée
   * @param minuteRate - Tarif à la minute
   * @param durationMinutes - Durée en minutes
   */
  static calculateProjectCost(minuteRate: number, durationMinutes: number): number {
    if (!minuteRate || !durationMinutes || minuteRate <= 0 || durationMinutes <= 0) {
      return 0;
    }
    return Number((minuteRate * durationMinutes).toFixed(2));
  }

  /**
   * Calcule le coût d'une ressource pour un projet
   * @param dailyRate - Tarif journalier du candidat
   * @param durationDays - Durée du projet en jours
   */
  static calculateResourceCost(dailyRate: number, durationDays: number): number {
    if (!dailyRate || !durationDays || dailyRate <= 0 || durationDays <= 0) {
      return 0;
    }
    const minuteRate = this.getDailyToMinuteRate(dailyRate);
    const durationMinutes = durationDays * this.MINUTES_PER_DAY;
    return this.calculateProjectCost(minuteRate, durationMinutes);
  }

  /**
   * Formate un prix pour l'affichage
   * @param amount - Montant à formater
   * @param currency - Devise (défaut: EUR)
   * @param showCents - Afficher les centimes (défaut: true)
   */
  static formatPrice(amount: number, currency: string = 'EUR', showCents: boolean = true): string {
    if (amount === null || amount === undefined) return '0 €';

    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    };

    return new Intl.NumberFormat('fr-FR', options).format(amount);
  }

  /**
   * Formate un prix à la minute pour l'affichage standard
   * C'est LE format d'affichage principal dans l'application
   */
  static formatMinuteRate(minuteRate: number): string {
    if (!minuteRate || minuteRate <= 0) return '0 €/min';
    return `${this.formatPrice(minuteRate)}/min`;
  }

  /**
   * Formate un prix journalier pour l'affichage
   * Utilisé UNIQUEMENT dans les paramètres candidat
   */
  static formatDailyRate(dailyRate: number): string {
    if (!dailyRate || dailyRate <= 0) return '0 €/jour';
    return `${this.formatPrice(dailyRate)}/jour`;
  }

  /**
   * Compare deux tarifs et retourne la différence en pourcentage
   */
  static compareRates(rate1: number, rate2: number): {
    difference: number;
    percentage: number;
    isHigher: boolean;
  } {
    if (!rate1 || !rate2) {
      return { difference: 0, percentage: 0, isHigher: false };
    }

    const difference = rate1 - rate2;
    const percentage = Math.abs((difference / rate2) * 100);

    return {
      difference: Number(difference.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      isHigher: difference > 0
    };
  }

  /**
   * Calcule le tarif moyen d'une équipe
   * @param dailyRates - Array des tarifs journaliers des membres
   */
  static calculateTeamAverageRate(dailyRates: number[]): {
    averageDailyRate: number;
    averageMinuteRate: number;
    totalDailyRate: number;
    totalMinuteRate: number;
  } {
    if (!dailyRates || dailyRates.length === 0) {
      return {
        averageDailyRate: 0,
        averageMinuteRate: 0,
        totalDailyRate: 0,
        totalMinuteRate: 0
      };
    }

    const validRates = dailyRates.filter(rate => rate > 0);
    if (validRates.length === 0) {
      return {
        averageDailyRate: 0,
        averageMinuteRate: 0,
        totalDailyRate: 0,
        totalMinuteRate: 0
      };
    }

    const totalDailyRate = validRates.reduce((sum, rate) => sum + rate, 0);
    const averageDailyRate = totalDailyRate / validRates.length;

    return {
      averageDailyRate: Number(averageDailyRate.toFixed(2)),
      averageMinuteRate: this.getDailyToMinuteRate(averageDailyRate),
      totalDailyRate: Number(totalDailyRate.toFixed(2)),
      totalMinuteRate: this.getDailyToMinuteRate(totalDailyRate)
    };
  }

  /**
   * Estime le budget nécessaire pour un projet
   * @param resources - Array des ressources avec leur tarif et durée estimée
   */
  static estimateProjectBudget(resources: Array<{
    dailyRate: number;
    estimatedDays: number;
  }>): {
    totalBudget: number;
    totalMinutes: number;
    averageMinuteRate: number;
    breakdown: Array<{
      cost: number;
      minuteRate: number;
      minutes: number;
    }>;
  } {
    if (!resources || resources.length === 0) {
      return {
        totalBudget: 0,
        totalMinutes: 0,
        averageMinuteRate: 0,
        breakdown: []
      };
    }

    let totalBudget = 0;
    let totalMinutes = 0;
    const breakdown: Array<{
      cost: number;
      minuteRate: number;
      minutes: number;
    }> = [];

    for (const resource of resources) {
      if (resource.dailyRate > 0 && resource.estimatedDays > 0) {
        const minuteRate = this.getDailyToMinuteRate(resource.dailyRate);
        const minutes = resource.estimatedDays * this.MINUTES_PER_DAY;
        const cost = this.calculateProjectCost(minuteRate, minutes);

        totalBudget += cost;
        totalMinutes += minutes;

        breakdown.push({
          cost,
          minuteRate,
          minutes
        });
      }
    }

    const averageMinuteRate = totalMinutes > 0 ? totalBudget / totalMinutes : 0;

    return {
      totalBudget: Number(totalBudget.toFixed(2)),
      totalMinutes,
      averageMinuteRate: Number(averageMinuteRate.toFixed(2)),
      breakdown
    };
  }
}
/** Presentation only. The consumer owns the command and its authorization. */
export interface PageCardPrimaryAction {
  label: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
  disabled?: boolean;
  permission?: string | string[];
  tutorialTarget?: string;
}

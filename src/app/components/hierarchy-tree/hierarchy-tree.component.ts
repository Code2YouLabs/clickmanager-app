import { CommonModule } from '@angular/common';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { MaterialModule } from 'src/app/material.module';
import { SectionCardComponent } from '../section-card/section-card.component';

export interface HierarchyTreeNode<T = unknown> {
  id: string | number;
  label: string;
  description?: string | null;
  meta?: string | null;
  data: T;
  children?: HierarchyTreeNode<T>[];
}

export interface HierarchyTreeAction<T = unknown> {
  id: string;
  label: string;
  icon: string;
  color?: ThemePalette;
  visible?: (node: HierarchyTreeNode<T>) => boolean;
  disabled?: (node: HierarchyTreeNode<T>) => boolean;
}

export interface HierarchyTreeActionEvent<T = unknown> {
  action: string;
  node: HierarchyTreeNode<T>;
}

@Component({
  selector: 'app-hierarchy-tree',
  standalone: true,
  imports: [CommonModule, MaterialModule, SectionCardComponent],
  templateUrl: './hierarchy-tree.component.html',
  styleUrl: './hierarchy-tree.component.scss',
})
export class HierarchyTreeComponent<T = unknown> implements OnChanges {
  @Input() nodes: HierarchyTreeNode<T>[] = [];
  @Input() actions: HierarchyTreeAction<T>[] = [];
  @Input() loading = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() emptyTitle = 'Nenhum item encontrado';
  @Input() emptyDescription = '';
  @Input() expandAll = false;
  @Input() showDragHandle = false;

  @Output() action = new EventEmitter<HierarchyTreeActionEvent<T>>();

  readonly treeControl = new NestedTreeControl<HierarchyTreeNode<T>>((node) => node.children || []);
  readonly dataSource = new MatTreeNestedDataSource<HierarchyTreeNode<T>>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) {
      this.dataSource.data = this.nodes || [];
    }

    if (changes['nodes'] || changes['expandAll']) {
      queueMicrotask(() => {
        if (this.expandAll) {
          this.treeControl.expandAll();
          return;
        }

        this.treeControl.collapseAll();
        this.nodes.filter((node) => this.hasChildren(node)).forEach((node) => this.treeControl.expand(node));
      });
    }
  }

  hasChild = (_: number, node: HierarchyTreeNode<T>): boolean => this.hasChildren(node);

  trackByNode = (_: number, node: HierarchyTreeNode<T>): string | number => node.id;

  visibleActions(node: HierarchyTreeNode<T>): HierarchyTreeAction<T>[] {
    return this.actions.filter((action) => action.visible ? action.visible(node) : true);
  }

  isActionDisabled(node: HierarchyTreeNode<T>, action: HierarchyTreeAction<T>): boolean {
    return action.disabled ? action.disabled(node) : false;
  }

  emitAction(node: HierarchyTreeNode<T>, action: HierarchyTreeAction<T>, event: Event): void {
    event.stopPropagation();
    if (this.isActionDisabled(node, action)) {
      return;
    }
    this.action.emit({ action: action.id, node });
  }

  private hasChildren(node: HierarchyTreeNode<T>): boolean {
    return !!node.children?.length;
  }
}

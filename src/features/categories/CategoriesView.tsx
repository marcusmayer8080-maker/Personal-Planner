import { useState } from 'react';
import { NewProjectPopover } from '../../components/AddPopover';
import { CATEGORIES, categoryByKey } from '../../domain/categories';
import type { FlatCategoryKey } from '../../domain/types';
import { usePlanner } from '../../store/plannerStore';
import { useUi } from '../../store/uiStore';
import { FlatCategoryList } from './FlatCategoryList';
import { ProjectCard } from './ProjectCard';

function ProjectsBoard() {
  const projects = usePlanner((s) => s.projects);
  const tasks = usePlanner((s) => s.tasks);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="board-actions">
        <button className="icon-btn square-btn" aria-label="افزودن پروژه" onClick={() => setAdding((a) => !a)}>+</button>
      </div>
      {projects.length === 0 ? (
        <div className="empty-note">هنوز پروژه‌ای نساختی — رو + بزن</div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} tasks={tasks.filter((t) => t.projectId === p.id)} />
          ))}
        </div>
      )}
      {adding && <NewProjectPopover onClose={() => setAdding(false)} />}
    </>
  );
}

export function CategoriesView() {
  const { activeCategory, setActiveCategory } = useUi();
  const cat = categoryByKey(activeCategory);

  return (
    <>
      <div className="chip-row">
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`chip${c.key === activeCategory ? ' active' : ''}`} onClick={() => setActiveCategory(c.key)}>
            <span className="ic">{c.icon}</span>
            {c.short}
          </button>
        ))}
      </div>
      <div className="cat-head">
        <h2>{cat.title}</h2>
      </div>
      {cat.kind === 'projects' ? (
        <ProjectsBoard />
      ) : (
        <FlatCategoryList key={cat.key} categoryKey={cat.key as FlatCategoryKey} />
      )}
    </>
  );
}

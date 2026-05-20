function SideMenu() {
  return (
    <aside className="side-menu">
      <div className="side-menu__header">
        <span className="side-menu__label">Tools</span>
      </div>

      <div className="side-menu__group">
        <button type="button" className="side-menu__item">
          Shapes
        </button>
        <button type="button" className="side-menu__item">
          Text
        </button>
        <button type="button" className="side-menu__item">
          Colours
        </button>
        <button type="button" className="side-menu__item">
          Stroke
        </button>
        <button type="button" className="side-menu__item">
          Layers
        </button>
      </div>

      <div className="side-menu__footer">
        <button type="button" className="side-menu__item side-menu__item--muted">
          More later
        </button>
      </div>
    </aside>
  );
}

export default SideMenu;
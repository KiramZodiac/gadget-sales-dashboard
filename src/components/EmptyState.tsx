interface EmptyStateProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
  }
  
  export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
    return (
      <div className="text-center">
        {title && <h2 className="text-lg font-bold">{title}</h2>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  };
import React, { FC, memo, useState, CSSProperties } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  BaseEdge,
} from '@xyflow/react';
import {
  ArrowRightLeft,
  FileText,
  Eye,
  Link,
  Zap,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types de path supportés
type PathType = 'bezier' | 'smoothstep' | 'straight';

// Configuration de style pour l'edge
interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  animated?: boolean;
}

// Configuration du bouton/label
interface ButtonConfig {
  icon?: LucideIcon;
  iconSize?: number;
  backgroundColor?: string;
  backgroundHover?: string;
  borderColor?: string;
  borderWidth?: number;
  shadowColor?: string;
  showOnHover?: boolean;
  scale?: number;
  scaleHover?: number;
  tooltip?: string;
}

// Props étendues pour notre composant universel
export interface UniversalEdgeData {
  // Callbacks
  onClick?: (id: string, source: string, target: string) => void;
  onHover?: (isHovered: boolean) => void;

  // Configuration visuelle
  pathType?: PathType;
  style?: EdgeStyle;
  button?: ButtonConfig | false; // false pour désactiver le bouton

  // Labels additionnels
  label?: string;
  labelStyle?: CSSProperties;
  labelPosition?: 'center' | 'start' | 'end';

  // Animation
  pulseAnimation?: boolean;
  glowEffect?: boolean;

  // Custom class names
  className?: string;
  buttonClassName?: string;
}

const defaultButtonConfig: ButtonConfig = {
  icon: ArrowRightLeft,
  iconSize: 20,
  backgroundColor: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  backgroundHover: 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)',
  borderColor: 'white',
  borderWidth: 3,
  shadowColor: 'rgba(139, 92, 246, 0.4)',
  showOnHover: false,
  scale: 1,
  scaleHover: 1.1,
  tooltip: 'Voir les détails',
};

const defaultEdgeStyle: EdgeStyle = {
  stroke: '#8B5CF6',
  strokeWidth: 3,
  animated: false,
};

const UniversalEdge: FC<EdgeProps<UniversalEdgeData>> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  source,
  target,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Extraction des configurations avec valeurs par défaut
  const pathType = data?.pathType || 'bezier';
  const edgeStyle = { ...defaultEdgeStyle, ...data?.style };
  const buttonConfig = data?.button !== false
    ? { ...defaultButtonConfig, ...data?.button }
    : null;

  // Calcul du path selon le type
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (pathType === 'bezier') {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else if (pathType === 'smoothstep') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  }

  // Calcul de la position du label selon la configuration
  const getLabelPosition = () => {
    if (data?.labelPosition === 'start') {
      return { x: sourceX + 50, y: sourceY };
    } else if (data?.labelPosition === 'end') {
      return { x: targetX - 50, y: targetY };
    }
    return { x: labelX, y: labelY };
  };

  const { x: finalLabelX, y: finalLabelY } = getLabelPosition();

  // Gestion des événements
  const handleMouseEnter = () => {
    setIsHovered(true);
    data?.onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    data?.onHover?.(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  };

  // Application des effets visuels
  const getEdgeClassName = () => {
    const classes = [data?.className];
    if (data?.pulseAnimation) classes.push('animate-pulse');
    if (edgeStyle.animated) classes.push('animated');
    return cn(...classes);
  };

  const getEdgeStyle = (): CSSProperties => {
    const style: CSSProperties = {
      stroke: edgeStyle.stroke,
      strokeWidth: edgeStyle.strokeWidth,
      strokeDasharray: edgeStyle.strokeDasharray,
    };

    if (data?.glowEffect && isHovered) {
      style.filter = `drop-shadow(0 0 8px ${edgeStyle.stroke})`;
    }

    return style;
  };

  // Rendu du bouton si configuré
  const renderButton = () => {
    if (!buttonConfig) return null;

    const shouldShow = !buttonConfig.showOnHover || isHovered;
    if (!shouldShow) return null;

    const Icon = buttonConfig.icon || ArrowRightLeft;
    const iconSize = isHovered
      ? (buttonConfig.iconSize || 20) + 2
      : buttonConfig.iconSize || 20;

    const buttonSize = isHovered ? 48 : 44;

    return (
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${finalLabelX}px,${finalLabelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn("nodrag nopan", data?.buttonClassName)}
        >
          <button
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: '50%',
              background: isHovered
                ? buttonConfig.backgroundHover
                : buttonConfig.backgroundColor,
              border: `${isHovered ? buttonConfig.borderWidth + 1 : buttonConfig.borderWidth}px solid ${buttonConfig.borderColor}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isHovered
                ? `0 8px 20px ${buttonConfig.shadowColor}`
                : `0 4px 15px ${buttonConfig.shadowColor}`,
              padding: 0,
              outline: 'none',
              transition: 'all 0.2s ease',
              transform: isHovered
                ? `scale(${buttonConfig.scaleHover})`
                : `scale(${buttonConfig.scale})`,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            type="button"
            title={buttonConfig.tooltip}
          >
            <Icon
              size={iconSize}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    );
  };

  // Rendu du label texte si configuré
  const renderLabel = () => {
    if (!data?.label) return null;

    return (
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${finalLabelX}px,${finalLabelY + 30}px)`,
            ...data.labelStyle,
          }}
          className="text-xs bg-white dark:bg-neutral-900 px-2 py-1 rounded shadow-md"
        >
          {data.label}
        </div>
      </EdgeLabelRenderer>
    );
  };

  return (
    <>
      {/* Edge path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={getEdgeClassName()}
        style={getEdgeStyle()}
      />

      {/* Bouton interactif optionnel */}
      {renderButton()}

      {/* Label texte optionnel */}
      {renderLabel()}
    </>
  );
});

UniversalEdge.displayName = 'UniversalEdge';

// Export des configurations prédéfinies pour faciliter l'utilisation
export const edgePresets = {
  default: {
    pathType: 'bezier' as PathType,
    style: defaultEdgeStyle,
    button: defaultButtonConfig,
  },
  deliverable: {
    pathType: 'bezier' as PathType,
    style: { ...defaultEdgeStyle, stroke: '#10B981' },
    button: { ...defaultButtonConfig, icon: FileText, tooltip: 'Voir les livrables' },
  },
  view: {
    pathType: 'smoothstep' as PathType,
    style: { ...defaultEdgeStyle, stroke: '#3B82F6' },
    button: { ...defaultButtonConfig, icon: Eye, tooltip: 'Voir les détails' },
  },
  connection: {
    pathType: 'straight' as PathType,
    style: { ...defaultEdgeStyle, stroke: '#F59E0B', strokeDasharray: '5 5' },
    button: { ...defaultButtonConfig, icon: Link, tooltip: 'Connexion' },
  },
  energy: {
    pathType: 'bezier' as PathType,
    style: { ...defaultEdgeStyle, stroke: '#EC4899', animated: true },
    button: {
      ...defaultButtonConfig,
      icon: Zap,
      backgroundColor: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      tooltip: 'Flux énergétique'
    },
    pulseAnimation: true,
    glowEffect: true,
  },
};

export default UniversalEdge;
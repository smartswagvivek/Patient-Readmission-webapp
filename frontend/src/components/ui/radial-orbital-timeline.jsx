import { useEffect, useRef, useState } from "react";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "./badge.jsx";
import { Button } from "./button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "./card.jsx";

export default function RadialOrbitalTimeline({ timelineData = [] }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState({});
  const [activeNodeId, setActiveNodeId] = useState(null);
  const containerRef = useRef(null);
  const nodeRefs = useRef({});

  const handleContainerClick = (event) => {
    if (event.target === containerRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId) => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const centerViewOnNode = (nodeId) => {
    if (!nodeRefs.current[nodeId]) return;
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    if (nodeIndex < 0 || timelineData.length === 0) return;
    const targetAngle = (nodeIndex / timelineData.length) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const nextState = {};
      const isOpening = !prev[id];
      if (isOpening) {
        nextState[id] = true;
        setActiveNodeId(id);
        setAutoRotate(false);
        centerViewOnNode(id);
        const relatedItems = getRelatedItems(id);
        const pulse = {};
        relatedItems.forEach((relatedId) => {
          pulse[relatedId] = true;
        });
        setPulseEffect(pulse);
      } else {
        setActiveNodeId(null);
        setPulseEffect({});
        setAutoRotate(true);
      }
      return nextState;
    });
  };

  useEffect(() => {
    if (!autoRotate) return undefined;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.25) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const calculateNodePosition = (index, total) => {
    if (!total) return { x: 0, y: 0, zIndex: 100, opacity: 1 };
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 155;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 40 * Math.cos(radian));
    const opacity = Math.max(0.45, Math.min(1, 0.45 + 0.55 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, zIndex, opacity };
  };

  const isRelatedToActive = (itemId) => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "completed":
        return "text-emerald-700 bg-emerald-100 border-emerald-300";
      case "in-progress":
        return "text-blue-700 bg-blue-100 border-blue-300";
      case "pending":
        return "text-amber-700 bg-amber-100 border-amber-300";
      default:
        return "text-slate-600 bg-slate-100 border-slate-300";
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="orbital-surface relative h-[460px] w-full overflow-hidden rounded-3xl border border-sky-100 p-4 shadow-card"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(47,128,237,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(29,211,176,0.15),transparent_35%),linear-gradient(160deg,rgba(255,255,255,0.95),rgba(235,247,255,0.92))]" />
      <div className="relative flex h-full items-center justify-center" style={{ perspective: "1200px" }}>
        <div className="orbital-rotate absolute h-[330px] w-[330px] rounded-full border border-sky-200 shadow-orbital" />
        <div className="absolute h-[250px] w-[250px] rounded-full border border-cyan-100" />
        <div className="orbital-center absolute z-10 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600">
          <div className="h-7 w-7 rounded-full bg-white/90" />
        </div>

        {timelineData.map((item, index) => {
          const pos = calculateNodePosition(index, timelineData.length);
          const isExpanded = Boolean(expandedItems[item.id]);
          const isRelated = isRelatedToActive(item.id);
          const isPulsing = Boolean(pulseEffect[item.id]);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              ref={(el) => {
                nodeRefs.current[item.id] = el;
              }}
              className="absolute cursor-pointer transition-all duration-700"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                zIndex: isExpanded ? 220 : pos.zIndex,
                opacity: isExpanded ? 1 : pos.opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(item.id);
              }}
            >
              <div
                className={`absolute -inset-1 rounded-full ${isPulsing ? "orbital-pulse-ring" : ""}`}
                style={{
                  background:
                    "radial-gradient(circle, rgba(47,128,237,0.26) 0%, rgba(47,128,237,0.02) 72%)",
                }}
              />

              <div
                className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isExpanded
                    ? "scale-150 border-cyan-200 bg-white text-blue-900 shadow-xl shadow-cyan-200/70"
                    : isRelated
                      ? "border-sky-300 bg-white text-blue-900"
                      : "border-sky-200 bg-white/85 text-blue-800"
                }`}
              >
                <Icon size={16} />
              </div>

              <div
                className={`absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wide transition-all duration-300 ${
                  isExpanded ? "scale-110 text-blue-800" : "text-blue-700/80"
                }`}
              >
                {item.title}
              </div>

              {isExpanded ? (
                <Card className="absolute left-1/2 top-[4.5rem] w-72 -translate-x-1/2 border-sky-200 bg-white/95 text-slate-800 backdrop-blur-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={getStatusStyles(item.status)}>
                        {item.status === "completed"
                          ? "COMPLETED"
                          : item.status === "in-progress"
                            ? "IN PROGRESS"
                            : "PENDING"}
                      </Badge>
                      <span className="text-xs font-mono text-slate-500">{item.date}</span>
                    </div>
                    <CardTitle className="text-base text-slate-800">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-700">
                    <p>{item.content}</p>
                    <div className="rounded-lg border border-sky-200 p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1">
                          <Zap size={11} />
                          Care Impact
                        </span>
                        <span className="font-mono">{item.energy}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-sky-100">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                          style={{ width: `${item.energy}%` }}
                        />
                      </div>
                    </div>

                    {item.relatedIds.length > 0 ? (
                      <div className="space-y-2 border-t border-sky-200 pt-2">
                        <div className="inline-flex items-center gap-1 text-slate-500">
                          <LinkIcon size={11} />
                          Connected Stages
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.relatedIds.map((relatedId) => {
                            const relatedItem = timelineData.find((x) => x.id === relatedId);
                            return (
                              <Button
                                key={relatedId}
                                size="sm"
                                variant="outline"
                                className="h-6 border-sky-300 bg-white px-2 text-[10px] text-slate-700 hover:bg-sky-50"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleItem(relatedId);
                                }}
                              >
                                {relatedItem?.title || `Node ${relatedId}`}
                                <ArrowRight size={8} className="ml-1" />
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

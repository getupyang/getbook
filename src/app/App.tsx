import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Library,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { analyzeCapture } from "./analysis";
import {
  HIGHLIGHT_STROKE_COLOR,
  clampHighlightPoint,
  createMarkedPhotoUrl,
  drawHighlightStrokes,
  hasHighlightStrokes,
} from "./highlight";
import { compressImage } from "./image";
import {
  AppState,
  Book,
  BookRecord,
  HighlightStroke,
  RecordStatus,
  createBook,
  createCapture,
  formatTimestamp,
} from "./model";
import { loadAppState, saveAppState } from "./storage";

type Screen = "bookshelf" | "book" | "new_record" | "detail" | "edit";

function StatusBadge({ status }: { status: RecordStatus }) {
  const map = {
    saved: {
      label: "已保存",
      cls: "bg-stone-100 text-stone-500",
      icon: <Check className="w-3 h-3" />,
    },
    processing: {
      label: "整理中",
      cls: "bg-amber-50 text-amber-600",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    processed: {
      label: "已整理",
      cls: "bg-emerald-50 text-emerald-600",
      icon: <Check className="w-3 h-3" />,
    },
    failed: {
      label: "整理失败",
      cls: "bg-red-50 text-red-500",
      icon: <AlertCircle className="w-3 h-3" />,
    },
  } satisfies Record<RecordStatus, { label: string; cls: string; icon: ReactElement }>;

  const { label, cls, icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}
    >
      {icon}
      {label}
    </span>
  );
}

function AddBookForm({ onAdd }: { onAdd: (title: string, author: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title, author);
    setTitle("");
    setAuthor("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
      >
        <Plus className="w-4 h-4" />
        新增一本书
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="书名"
        className="w-full bg-input-background rounded-xl px-3 py-3 text-sm focus:outline-none"
      />
      <input
        value={author}
        onChange={(event) => setAuthor(event.target.value)}
        placeholder="作者（可选）"
        className="w-full bg-input-background rounded-xl px-3 py-3 text-sm focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl py-3 text-sm text-muted-foreground bg-secondary"
        >
          取消
        </button>
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="flex-1 rounded-xl py-3 text-sm bg-foreground text-primary-foreground disabled:opacity-40"
        >
          开始记录
        </button>
      </div>
    </div>
  );
}

function BookshelfScreen({
  books,
  onOpenBook,
  onAddBook,
}: {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onAddBook: (title: string, author: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase mb-0.5">
          Getbook
        </p>
        <h1
          className="text-[22px] font-semibold text-foreground"
          style={{ fontFamily: "'Lora', serif" }}
        >
          我的书
        </h1>
      </div>

      <div className="px-5 py-3 space-y-3">
        {books.length === 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-8 text-center">
            <p className="text-sm text-foreground font-medium">先添加一本正在读的书</p>
            <p className="text-xs text-muted-foreground mt-1">
              之后打开会默认回到最近活跃的书。
            </p>
          </div>
        )}

        {books.map((book) => {
          const processingCount = book.records.filter(
            (record) => record.status === "processing"
          ).length;
          const failedCount = book.records.filter(
            (record) => record.status === "failed"
          ).length;

          return (
            <button
              key={book.id}
              onClick={() => onOpenBook(book)}
              className="w-full text-left bg-card rounded-2xl px-4 py-4 border border-border active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[17px] font-medium text-foreground leading-snug"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {book.author}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                <span className="text-xs text-muted-foreground">
                  {book.records.length} 条记录
                </span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">
                  {book.lastActive}
                </span>
                {processingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {processingCount} 整理中
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {failedCount} 失败
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-5 pt-1 pb-8">
        <AddBookForm onAdd={onAddBook} />
      </div>
    </div>
  );
}

function RecordCard({ record, onTap }: { record: BookRecord; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-card rounded-2xl border border-border overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="flex gap-3 p-3.5">
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted">
          {record.photoUrl ? (
            <img
              src={record.markedPhotoUrl ?? record.photoUrl}
              alt="书页照片"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">{record.timestamp}</span>
            <StatusBadge status={record.status} />
          </div>

          {record.status === "processed" && (record.quote || record.thought) ? (
            <p
              className="text-sm text-foreground leading-snug line-clamp-2 italic"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {record.quote ? `"${record.quote}"` : record.thought}
            </p>
          ) : (
            <p className="text-sm text-foreground/70 leading-snug line-clamp-2">
              {record.rawInput}
            </p>
          )}

          {record.status === "processed" && record.page && (
            <p className="text-xs text-muted-foreground mt-1">第 {record.page} 页</p>
          )}
        </div>
      </div>
    </button>
  );
}

function BookScreen({
  book,
  onBack,
  onNewRecord,
  onOpenRecord,
}: {
  book: Book;
  onBack: () => void;
  onNewRecord: () => void;
  onOpenRecord: (record: BookRecord) => void;
}) {
  const processingCount = book.records.filter((record) => record.status === "processing").length;
  const failedCount = book.records.filter((record) => record.status === "failed").length;

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <Library className="w-3.5 h-3.5" />
          <span className="ml-0.5">书架</span>
        </button>
      </div>

      <div className="px-5 pb-4 border-b border-border">
        <h1
          className="text-[22px] font-semibold text-foreground leading-tight"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {book.title}
        </h1>
        {book.author && (
          <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
          <span className="text-xs text-muted-foreground">
            {book.records.length} 条记录
          </span>
          {processingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              {processingCount} 整理中
            </span>
          )}
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {failedCount} 失败
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 pb-3">
        <button
          onClick={onNewRecord}
          className="w-full flex items-center justify-center gap-2.5 bg-foreground text-primary-foreground rounded-2xl py-4 text-[15px] font-medium active:scale-[0.98] transition-transform"
        >
          <Camera className="w-5 h-5" />
          添加记录
        </button>
      </div>

      {book.records.length > 0 ? (
        <div className="px-5 pb-8 space-y-2.5">
          <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-1">
            最近记录
          </p>
          {book.records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onTap={() => onOpenRecord(record)}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 flex flex-col items-center text-center">
          <p className="text-muted-foreground text-sm">还没有记录</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            添加一张书页照片开始记录
          </p>
        </div>
      )}
    </div>
  );
}

function HighlightPhotoEditor({
  photoUrl,
  strokes,
  busy,
  onChange,
  onChangePhoto,
  onRemovePhoto,
}: {
  photoUrl: string;
  strokes: HighlightStroke[];
  busy: boolean;
  onChange: (strokes: HighlightStroke[]) => void;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef(strokes);
  const [hintVisible, setHintVisible] = useState(true);
  const hasStrokes = hasHighlightStrokes(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const rect = image.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHighlightStrokes(
      ctx,
      strokesRef.current,
      canvas.width,
      canvas.height,
      Math.max(16, canvas.width * 0.04)
    );
  };

  useEffect(() => {
    renderCanvas();
  });

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!photoUrl) return;
    setHintVisible(true);
    const timer = window.setTimeout(() => setHintVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [photoUrl]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return clampHighlightPoint({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const setStrokes = (next: HighlightStroke[]) => {
    strokesRef.current = next;
    onChange(next);
  };

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (busy) return;
    const point = pointFromEvent(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setHintVisible(false);
    setStrokes([...strokesRef.current, { points: [point] }]);
  };

  const addPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;

    const current = strokesRef.current;
    const last = current[current.length - 1];
    if (!last) return;

    const previous = last.points[last.points.length - 1];
    if (previous) {
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (distance < 0.004) return;
    }

    setStrokes([
      ...current.slice(0, -1),
      {
        points: [...last.points, point],
      },
    ]);
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const current = strokesRef.current;
    const last = current[current.length - 1];
    if (last && last.points.length < 2) {
      setStrokes(current.slice(0, -1));
    }
  };

  const undo = () => {
    if (!hasStrokes || busy) return;
    setStrokes(strokesRef.current.slice(0, -1));
  };

  const clear = () => {
    if (!hasStrokes || busy) return;
    setStrokes([]);
  };

  return (
    <div className="space-y-2.5">
      <div className="relative w-full rounded-2xl overflow-hidden bg-muted">
        <img
          ref={imageRef}
          src={photoUrl}
          alt="书页照片"
          className="block w-full h-auto select-none"
          draggable={false}
          onLoad={renderCanvas}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: "none" }}
          onPointerDown={startStroke}
          onPointerMove={addPoint}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="在书页照片上划出想记录的原文"
        />

        {hintVisible && !hasStrokes && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
            <span className="rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white">
              在文字上划一下
            </span>
          </div>
        )}

        <button
          onClick={onChangePhoto}
          disabled={busy}
          className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs disabled:opacity-50"
        >
          换照片
        </button>
        <button
          onClick={onRemovePhoto}
          disabled={busy}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center disabled:opacity-50"
          aria-label="移除照片"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: HIGHLIGHT_STROKE_COLOR }}
          />
          <p className="text-xs text-foreground font-medium">荧光笔开启</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!hasStrokes || busy}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground disabled:opacity-35"
          >
            <Undo2 className="w-3.5 h-3.5" />
            撤销
          </button>
          <button
            onClick={clear}
            disabled={!hasStrokes || busy}
            className="rounded-full px-2.5 py-1.5 text-xs text-muted-foreground disabled:opacity-35"
          >
            清除
          </button>
        </div>
      </div>
    </div>
  );
}

function NewRecordScreen({
  bookTitle,
  onBack,
  onSave,
}: {
  bookTitle: string;
  onBack: () => void;
  onSave: (record: BookRecord) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [thought, setThought] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [highlightStrokes, setHighlightStrokes] = useState<HighlightStroke[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const image = await compressImage(file);
      setPhotoUrl(image.dataUrl);
      setHighlightStrokes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "照片处理失败");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const save = async () => {
    setError("");
    setBusy(true);
    try {
      let markedPhotoUrl: string | undefined;
      try {
        markedPhotoUrl = await createMarkedPhotoUrl(photoUrl, highlightStrokes);
      } catch {
        markedPhotoUrl = undefined;
      }

      await onSave(
        createCapture({
          photoUrl,
          markedPhotoUrl,
          highlightStrokes: hasHighlightStrokes(highlightStrokes)
            ? highlightStrokes
            : undefined,
          rawInput: thought,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          取消
        </button>
        <p className="text-xs text-muted-foreground">记录到《{bookTitle}》</p>
        <div className="w-12" />
      </div>

      <div className="px-5 pt-2 pb-8 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />

        {!photoUrl ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-card active:bg-muted transition-colors disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {busy ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {busy ? "正在压缩照片" : "添加书页照片"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                拍照或从相册选择
              </p>
            </div>
          </button>
        ) : (
          <HighlightPhotoEditor
            photoUrl={photoUrl}
            strokes={highlightStrokes}
            busy={busy}
            onChange={setHighlightStrokes}
            onChangePhoto={() => inputRef.current?.click()}
            onRemovePhoto={() => {
              setPhotoUrl("");
              setHighlightStrokes([]);
            }}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <textarea
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            placeholder="说说这段让你想到什么"
            rows={5}
            className="w-full px-4 pt-4 pb-4 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 leading-relaxed">{error}</p>
        )}

        <button
          onClick={save}
          disabled={busy || !photoUrl || !thought.trim()}
          className="w-full bg-foreground text-primary-foreground rounded-2xl py-4 text-[15px] font-medium active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          {busy ? "正在保存" : "保存"}
        </button>
      </div>
    </div>
  );
}

function DetailScreen({
  record,
  onBack,
  onEdit,
  onRetry,
}: {
  record: BookRecord;
  onBack: () => void;
  onEdit: () => void;
  onRetry: () => void;
}) {
  const [rawOpen, setRawOpen] = useState(record.status !== "processed");
  const pendingCopy = {
    saved: {
      title: "已保存，等待整理",
      body: "原始照片和文字已经保存在本机。",
      cls: "bg-stone-50 border-stone-100",
      titleCls: "text-stone-700",
      bodyCls: "text-stone-500",
      icon: <Check className="w-4 h-4 text-stone-500" />,
    },
    processing: {
      title: "正在整理",
      body: "AI 正在从照片和输入里识别划线句、想法和页码。",
      cls: "bg-amber-50 border-amber-100",
      titleCls: "text-amber-700",
      bodyCls: "text-amber-600/80",
      icon: <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />,
    },
    failed: {
      title: "整理失败，原始记录还在",
      body: "原始照片和文字已经保存在本机，可以稍后重试。",
      cls: "bg-red-50 border-red-100",
      titleCls: "text-red-700",
      bodyCls: "text-red-500/80",
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    },
  } satisfies Record<
    Exclude<RecordStatus, "processed">,
    {
      title: string;
      body: string;
      cls: string;
      titleCls: string;
      bodyCls: string;
      icon: ReactElement;
    }
  >;

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        {record.status === "processed" && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-sm text-foreground font-medium"
          >
            <Pencil className="w-3.5 h-3.5" />
            编辑
          </button>
        )}
      </div>

      <div className="px-5 space-y-4 pb-10">
        <div className="w-full rounded-2xl overflow-hidden bg-muted">
          <img
            src={record.markedPhotoUrl ?? record.photoUrl}
            alt="书页照片"
            className="block w-full h-auto"
          />
        </div>

        {record.status !== "processed" && (
          <div
            className={`border rounded-2xl px-4 py-3.5 flex items-start gap-3 ${pendingCopy[record.status].cls}`}
          >
            <div className="mt-0.5 shrink-0">
              {pendingCopy[record.status].icon}
            </div>
            <div>
              <p className={`text-sm font-medium ${pendingCopy[record.status].titleCls}`}>
                {pendingCopy[record.status].title}
              </p>
              <p
                className={`text-xs mt-0.5 leading-relaxed ${pendingCopy[record.status].bodyCls}`}
              >
                {pendingCopy[record.status].body}
              </p>
            </div>
          </div>
        )}

        {record.status === "processed" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                划线句
              </p>
              <p
                className="text-[15px] text-foreground leading-relaxed italic"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {record.quote ? `"${record.quote}"` : "未识别"}
              </p>
            </div>

            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                我的想法
              </p>
              <p className="text-[15px] text-foreground leading-relaxed">{record.thought}</p>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                页码
              </p>
              <p className="text-sm text-foreground font-medium">
                {record.page ? `第 ${record.page} 页` : "未识别"}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <StatusBadge status={record.status} />
          <p className="text-xs text-muted-foreground">{record.timestamp}</p>
        </div>

        <div className="border-t border-border pt-3">
          <button
            onClick={() => setRawOpen(!rawOpen)}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              原始记录
            </p>
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                rawOpen ? "rotate-90" : ""
              }`}
            />
          </button>
          {rawOpen && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {record.rawInput}
            </p>
          )}
        </div>

        {(record.status === "saved" || record.status === "failed") && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 border border-border bg-card rounded-2xl py-4 text-[15px] font-medium text-foreground active:scale-[0.98] transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            {record.status === "failed" ? "重试整理" : "整理这条"}
          </button>
        )}
      </div>
    </div>
  );
}

function EditScreen({
  record,
  onBack,
  onSave,
}: {
  record: BookRecord;
  onBack: () => void;
  onSave: (patch: Pick<BookRecord, "quote" | "thought" | "page">) => void;
}) {
  const [quote, setQuote] = useState(record.quote ?? "");
  const [thought, setThought] = useState(record.thought ?? "");
  const [page, setPage] = useState(String(record.page ?? ""));

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          取消
        </button>
        <p className="text-sm font-medium text-foreground">编辑记录</p>
        <button
          onClick={() =>
            onSave({
              quote,
              thought,
              page: page ? Number(page) : undefined,
            })
          }
          className="text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          保存
        </button>
      </div>

      <div className="px-5 space-y-4 pb-10 pt-1">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              划线句
            </p>
          </div>
          <textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            rows={4}
            className="w-full px-4 pb-4 bg-transparent text-[15px] text-foreground resize-none focus:outline-none leading-relaxed italic"
            style={{ fontFamily: "'Lora', serif" }}
          />
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              我的想法
            </p>
          </div>
          <textarea
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            rows={4}
            className="w-full px-4 pb-4 bg-transparent text-[15px] text-foreground resize-none focus:outline-none leading-relaxed"
          />
        </div>

        <div className="bg-card rounded-2xl border border-border px-4 py-3.5 flex items-center gap-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide shrink-0">
            页码
          </p>
          <input
            type="number"
            value={page}
            onChange={(event) => setPage(event.target.value)}
            placeholder="—"
            className="flex-1 bg-transparent text-[15px] text-foreground text-right focus:outline-none font-medium"
          />
        </div>

        <button
          onClick={() =>
            onSave({
              quote,
              thought,
              page: page ? Number(page) : undefined,
            })
          }
          className="w-full bg-foreground text-primary-foreground rounded-2xl py-4 text-[15px] font-medium active:scale-[0.98] transition-transform"
        >
          保存修改
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [screen, setScreen] = useState<Screen>("bookshelf");
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const stateRef = useRef<AppState | null>(null);

  useEffect(() => {
    loadAppState()
      .then((loaded) => {
        stateRef.current = loaded;
        setState(loaded);
        if (loaded.activeBookId && loaded.books.length > 0) {
          setScreen("book");
        }
      })
      .catch((error) => {
        setStorageError(error instanceof Error ? error.message : "本地存储读取失败");
        setState({ books: [], activeBookId: null });
      });
  }, []);

  const activeBook = useMemo(() => {
    if (!state?.activeBookId) return null;
    return state.books.find((book) => book.id === state.activeBookId) ?? null;
  }, [state]);

  const activeRecord = useMemo(() => {
    if (!activeBook || !activeRecordId) return null;
    return activeBook.records.find((record) => record.id === activeRecordId) ?? null;
  }, [activeBook, activeRecordId]);

  const persist = async (nextState: AppState) => {
    stateRef.current = nextState;
    setState(nextState);
    setStorageError("");
    try {
      await saveAppState(nextState);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "本地保存失败");
    }
  };

  const updateActiveBook = async (updater: (book: Book) => Book) => {
    if (!state || !activeBook) return;
    const nextBook = updater(activeBook);
    await persist({
      ...state,
      activeBookId: nextBook.id,
      books: state.books.map((book) => (book.id === nextBook.id ? nextBook : book)),
    });
  };

  const findBookTitle = (baseState: AppState, recordId: string) => {
    return baseState.books.find((book) =>
      book.records.some((record) => record.id === recordId)
    )?.title;
  };

  const changeRecord = async (
    recordId: string,
    updater: (record: BookRecord) => BookRecord,
    baseState = stateRef.current
  ) => {
    if (!baseState) return null;

    let updatedRecord: BookRecord | null = null;
    const nextState: AppState = {
      ...baseState,
      books: baseState.books.map((book) => ({
        ...book,
        records: book.records.map((record) => {
          if (record.id !== recordId) return record;
          updatedRecord = updater(record);
          return updatedRecord;
        }),
      })),
    };

    const record = updatedRecord as BookRecord | null;
    if (!record) return null;
    await persist(nextState);
    return { nextState, record };
  };

  const analyzeRecord = async (recordId: string, baseState = stateRef.current) => {
    const started = await changeRecord(
      recordId,
      (record) => ({ ...record, status: "processing" }),
      baseState
    );
    if (!started) return;

    try {
      const analysis = await analyzeCapture({
        imageDataUrl: started.record.markedPhotoUrl ?? started.record.photoUrl,
        rawInput: started.record.rawInput,
        bookTitle: findBookTitle(started.nextState, recordId) ?? "",
        hasHighlights: hasHighlightStrokes(started.record.highlightStrokes),
      });

      await changeRecord(recordId, (record) => ({
        ...record,
        quote: analysis.quote,
        thought: analysis.thought,
        page: analysis.page,
        status: "processed",
      }));
    } catch {
      await changeRecord(recordId, (record) => ({
        ...record,
        status: "failed",
      }));
    }
  };

  const addBook = async (title: string, author: string) => {
    if (!state) return;
    const book = createBook(title, author);
    await persist({
      books: [book, ...state.books],
      activeBookId: book.id,
    });
    setScreen("book");
  };

  const openBook = async (book: Book) => {
    if (!state) return;
    const updatedBook = { ...book, lastActive: formatTimestamp() };
    await persist({
      ...state,
      activeBookId: book.id,
      books: state.books.map((item) => (item.id === book.id ? updatedBook : item)),
    });
    setScreen("book");
  };

  const saveRecord = async (record: BookRecord) => {
    const baseState = stateRef.current;
    if (!baseState || !activeBook) return;

    const currentBook =
      baseState.books.find((book) => book.id === activeBook.id) ?? activeBook;
    const nextBook = {
      ...currentBook,
      lastActive: record.timestamp,
      records: [record, ...currentBook.records],
    };
    const nextState = {
      ...baseState,
      activeBookId: nextBook.id,
      books: baseState.books.map((book) => (book.id === nextBook.id ? nextBook : book)),
    };

    await persist(nextState);
    setActiveRecordId(record.id);
    setScreen("detail");
    void analyzeRecord(record.id, nextState);
  };

  const retryRecord = async () => {
    if (!activeRecord) return;
    void analyzeRecord(activeRecord.id);
  };

  const saveEditedRecord = async (patch: Pick<BookRecord, "quote" | "thought" | "page">) => {
    if (!activeRecord) return;
    await updateActiveBook((book) => ({
      ...book,
      records: book.records.map((record) =>
        record.id === activeRecord.id
          ? {
              ...record,
              ...patch,
              status: "processed",
            }
          : record
      ),
    }));
    setScreen("detail");
  };

  const appContent = () => {
    if (!state) return <LoadingScreen />;
    if (screen === "bookshelf") {
      return <BookshelfScreen books={state.books} onOpenBook={openBook} onAddBook={addBook} />;
    }
    if (!activeBook) {
      return <BookshelfScreen books={state.books} onOpenBook={openBook} onAddBook={addBook} />;
    }
    if (screen === "book") {
      return (
        <BookScreen
          book={activeBook}
          onBack={() => setScreen("bookshelf")}
          onNewRecord={() => setScreen("new_record")}
          onOpenRecord={(record) => {
            setActiveRecordId(record.id);
            setScreen("detail");
          }}
        />
      );
    }
    if (screen === "new_record") {
      return (
        <NewRecordScreen
          bookTitle={activeBook.title}
          onBack={() => setScreen("book")}
          onSave={saveRecord}
        />
      );
    }
    if (screen === "edit" && activeRecord) {
      return (
        <EditScreen
          key={activeRecord.id}
          record={activeRecord}
          onBack={() => setScreen("detail")}
          onSave={saveEditedRecord}
        />
      );
    }
    if (activeRecord) {
      return (
        <DetailScreen
          record={activeRecord}
          onBack={() => setScreen("book")}
          onEdit={() => setScreen("edit")}
          onRetry={retryRecord}
        />
      );
    }
    return (
      <BookScreen
        book={activeBook}
        onBack={() => setScreen("bookshelf")}
        onNewRecord={() => setScreen("new_record")}
        onOpenRecord={(record) => {
          setActiveRecordId(record.id);
          setScreen("detail");
        }}
      />
    );
  };

  return (
    <div
      className="min-h-screen flex justify-center bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="relative w-full max-w-[430px] min-h-screen bg-background overflow-hidden">
        {storageError && (
          <div className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {storageError}
          </div>
        )}
        {appContent()}
      </div>
    </div>
  );
}

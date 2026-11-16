
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ============================================
// TYPES
// ============================================

type Profile = {
  id: string;
  full_name: string | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profiles: Profile | null;
};

type Like = {
  post_id: string;
  user_id: string;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile | null;
};

type FeedFilter = "all" | "mine" | "photos";

// ============================================
// CONSTANTS AND PURE HELPERS
// ============================================

const MAX_POST_LENGTH = 5000;
const LONG_POST_LENGTH = 280;

function getInitial(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// ============================================
// ICONS
// ============================================

type IconName =
  | "heart"
  | "comment"
  | "trash"
  | "image"
  | "close"
  | "refresh"
  | "check"
  | "send"
  | "feed"
  | "user"
  | "camera";

function Icon({
  name,
  className = "h-5 w-5",
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    heart: (
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.8 8 3.6 5 6.7 5c1.9 0 3.5 1 5.3 3 1.8-2 3.4-3 5.3-3 3.1 0 4.9 3 3.9 6.1-1.7 4.8-9.2 9.4-9.2 9.4z" />
    ),
    comment: (
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="M21 16l-5-5-8 9" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6L6 18" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
      </>
    ),
    check: <path d="M4 12.5l5 5L20 6.5" />,
    send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />,
    feed: (
      <>
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
        <circle cx="12" cy="13.5" r="3.5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Avatar({
  name,
  size = "md",
  highlight = false,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-base",
    lg: "h-14 w-14 text-xl",
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${sizes[size]} ${
        highlight
          ? "bg-yellow-400 text-black"
          : "bg-yellow-100 text-stone-800"
      }`}
    >
      {getInitial(name)}
    </div>
  );
}

// ============================================
// PAGE
// ============================================

export default function CommunityPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  const [filter, setFilter] = useState<FeedFilter>("all");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [likeBurst, setLikeBurst] = useState<string | null>(null);

  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load the current user, profile, posts, likes, and comments.
  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      if (currentUserId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", currentUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        setCurrentProfile(profile as Profile | null);
      } else {
        setCurrentProfile(null);
      }

      const [
        { data: postData, error: postError },
        { data: likeData, error: likeError },
        { data: commentData, error: commentError },
      ] = await Promise.all([
        supabase
          .from("community_posts")
          .select(`
            id,
            user_id,
            content,
            image_url,
            created_at,
            profiles!community_posts_user_id_fkey (
              id,
              full_name
            )
          `)
          .order("created_at", { ascending: false }),

        supabase.from("community_likes").select("post_id, user_id"),

        supabase
          .from("community_comments")
          .select(`
            id,
            post_id,
            user_id,
            content,
            created_at,
            profiles!community_comments_user_id_fkey (
              id,
              full_name
            )
          `)
          .order("created_at", { ascending: true }),
      ]);

      if (postError) throw postError;
      if (likeError) throw likeError;
      if (commentError) throw commentError;

      setPosts((postData ?? []) as unknown as Post[]);
      setLikes((likeData ?? []) as Like[]);
      setComments((commentData ?? []) as unknown as Comment[]);
    } catch (err) {
      console.error("Community loading error:", err);
      setError(
        err instanceof Error ? err.message : "Could not load the community."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  // Preview selected images and clean up temporary URLs.
  useEffect(() => {
    if (!selectedImage) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  // Success messages disappear on their own.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // Dialogs: close with Escape and lock page scroll.
  useEffect(() => {
    if (!lightbox && !postToDelete) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightbox(null);
        setPostToDelete(null);
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, postToDelete]);

  // Create a text post, image post, or both.
  async function createPost() {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Please log in to publish a post.");
      return;
    }

    if (!content.trim() && !selectedImage) {
      setError("Write something or choose an image.");
      return;
    }

    if (selectedImage) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(selectedImage.type)) {
        setError("Choose a JPG, PNG, or WebP image.");
        return;
      }

      if (selectedImage.size > 5 * 1024 * 1024) {
        setError("The image must be smaller than 5 MB.");
        return;
      }
    }

    setPublishing(true);

    try {
      let imageUrl: string | null = null;

      if (selectedImage) {
        const extension =
          selectedImage.type === "image/jpeg"
            ? "jpg"
            : selectedImage.type.split("/")[1];

        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("sport-posts")
          .upload(path, selectedImage, {
            contentType: selectedImage.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        imageUrl = supabase.storage.from("sport-posts").getPublicUrl(path)
          .data.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("community_posts")
        .insert({
          user_id: userId,
          content: content.trim() || null,
          image_url: imageUrl,
        });

      if (insertError) throw insertError;

      setContent("");
      setSelectedImage(null);
      setMessage("Your post was published!");

      await loadCommunity();
    } catch (err) {
      console.error("Post creation error:", err);
      setError(
        err instanceof Error ? err.message : "Could not publish your post."
      );
    } finally {
      setPublishing(false);
    }
  }

  // Like or unlike a post.
  async function toggleLike(postId: string) {
    setError("");

    if (!userId) {
      setError("Please log in to like a post.");
      return;
    }

    const alreadyLiked = likes.some(
      (like) => like.post_id === postId && like.user_id === userId
    );

    const previousLikes = likes;

    if (!alreadyLiked) {
      setLikeBurst(postId);
      setTimeout(() => setLikeBurst(null), 450);
    }

    setLikes((current) =>
      alreadyLiked
        ? current.filter(
            (like) => !(like.post_id === postId && like.user_id === userId)
          )
        : [...current, { post_id: postId, user_id: userId }]
    );

    const result = alreadyLiked
      ? await supabase
          .from("community_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
      : await supabase
          .from("community_likes")
          .insert({ post_id: postId, user_id: userId });

    if (result.error) {
      setLikes(previousLikes);
      setError(result.error.message);
    }
  }

  // Add a comment.
  async function addComment(postId: string) {
    setError("");

    if (!userId) {
      setError("Please log in to comment.");
      return;
    }

    const commentText = (commentInputs[postId] ?? "").trim();

    if (!commentText) return;

    setSendingComment(postId);

    const { error: insertError } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: commentText,
      });

    if (insertError) {
      setError(insertError.message);
      setSendingComment(null);
      return;
    }

    setCommentInputs((current) => ({
      ...current,
      [postId]: "",
    }));

    await loadCommunity();
    setSendingComment(null);
  }

  // Delete a post owned by the current user (after in-page confirmation).
  async function confirmDeletePost() {
    const post = postToDelete;

    if (!post || !userId || post.user_id !== userId) return;

    setError("");
    setMessage("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", userId);

    setDeleting(false);
    setPostToDelete(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Post deleted.");
    await loadCommunity();
  }

  // Delete a comment owned by the current user.
  async function deleteComment(comment: Comment) {
    if (!userId || comment.user_id !== userId) return;

    const { error: deleteError } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", comment.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadCommunity();
  }

  function handleImageFile(file: File | null | undefined) {
    if (!file) return;
    setError("");
    setSelectedImage(file);
  }

  function toggleExpanded(postId: string) {
    setExpandedPosts((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  // ============================================
  // DERIVED DATA
  // ============================================

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filter === "mine") return post.user_id === userId;
      if (filter === "photos") return !!post.image_url;
      return true;
    });
  }, [posts, filter, userId]);

  const myStats = useMemo(() => {
    if (!userId) return { posts: 0, likes: 0, comments: 0 };

    const myPosts = posts.filter((p) => p.user_id === userId);
    const myPostIds = new Set(myPosts.map((p) => p.id));

    return {
      posts: myPosts.length,
      likes: likes.filter((l) => myPostIds.has(l.post_id)).length,
      comments: comments.filter((c) => c.user_id === userId).length,
    };
  }, [posts, likes, comments, userId]);

  const remaining = MAX_POST_LENGTH - content.length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-stone-900">
      <style>{`
        @keyframes postIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        .post-in { animation: postIn 600ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .pop { animation: pop 450ms ease; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
        .slide-down { animation: slideDown 260ms ease both; }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(14px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        .modal-in { animation: modalIn 260ms cubic-bezier(.22,.61,.36,1) both; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 220ms ease both; }

        @keyframes glow {
          0%, 100% { opacity: .16; transform: scale(1); }
          50%      { opacity: .3;  transform: scale(1.15); }
        }
        .glow { animation: glow 8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .post-in, .pop, .slide-down, .modal-in, .fade-in, .glow { animation: none !important; }
        }
      `}</style>

      {/* ========================================
          PAGE HEADER
      ======================================== */}

      <header className="relative isolate overflow-hidden bg-neutral-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
        <div className="glow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-yellow-400 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Sports <span className="text-yellow-400">Community</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
            Share your sports journey, ask for advice, and connect with other
            athletes.
          </p>
        </div>
      </header>

     <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Feedback messages */}
        {(error || message) && (
          <div className="mb-5 space-y-3">
            {error && (
              <div
                role="alert"
                className="slide-down flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                  className="shrink-0 text-red-400 transition hover:text-red-700"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="slide-down flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"
              >
                <Icon name="check" className="h-4 w-4" />
                {message}
              </div>
            )}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* ========================================
              LEFT COLUMN
          ======================================== */}
          <aside className="h-fit space-y-5 lg:sticky lg:top-28">
            {/* Composer */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-900/5">
              <div className="mb-5 flex items-center gap-3">
                <Avatar
                  name={currentProfile?.full_name}
                  size="lg"
                  highlight={!!userId}
                />

                <div className="min-w-0">
                  <h2 className="truncate font-bold text-stone-900">
                    {currentProfile?.full_name ||
                      (userId ? "Your profile" : "Guest")}
                  </h2>

                  <p className="mt-0.5 text-xs text-stone-500">
                    {userId
                      ? "Create a sports post"
                      : "Log in to share a post"}
                  </p>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter" &&
                    !publishing
                  ) {
                    event.preventDefault();
                    void createPost();
                  }
                }}
                placeholder="What's happening in your sports world?"
                aria-label="Post content"
                rows={5}
                maxLength={MAX_POST_LENGTH}
                className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-200"
              />

              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-400">
                <span>Ctrl + Enter to publish</span>
                <span className={remaining < 200 ? "text-amber-600" : ""}>
                  {remaining.toLocaleString()} left
                </span>
              </div>

              {preview ? (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-stone-200">
                  <img
                    src={preview}
                    alt="Selected post preview"
                    className="max-h-64 w-full bg-stone-50 object-contain"
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleImageFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                    dragging
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-stone-300 hover:border-yellow-400 hover:bg-yellow-50/50"
                  }`}
                >
                  <span className="text-yellow-600">
                    <Icon name="camera" className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold text-stone-700">
                    Add a photo
                  </span>
                  <span className="text-xs text-stone-400">
                    Drop it here or click. JPG, PNG or WebP, up to 5 MB.
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      handleImageFile(event.target.files?.[0])
                    }
                  />
                </label>
              )}

              <button
                type="button"
                onClick={createPost}
                disabled={publishing || (!content.trim() && !selectedImage)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? (
                  "Publishing..."
                ) : (
                  <>
                    <Icon name="send" className="h-4 w-4" />
                    Publish post
                  </>
                )}
              </button>
            </section>

            {/* Activity */}
            {userId && (
              <section className="rounded-2xl bg-neutral-950 p-5 text-white">
                <h2 className="mb-4 text-sm font-bold text-white/80">
                  Your activity
                </h2>

                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Posts", value: myStats.posts },
                    { label: "Likes received", value: myStats.likes },
                    { label: "Comments", value: myStats.comments },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dd className="text-2xl font-black text-yellow-400">
                        {stat.value}
                      </dd>
                      <dt className="mt-0.5 text-[11px] leading-tight text-white/55">
                        {stat.label}
                      </dt>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </aside>

          {/* ========================================
              RIGHT COLUMN: FEED
          ======================================== */}
          <section className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg shadow-stone-900/5">
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filter posts"
              >
                {(
                  [
                    ["all", "All posts", "feed"],
                    ["mine", "My posts", "user"],
                    
                  ] as [FeedFilter, string, IconName][]
                ).map(([value, label, icon]) => {
                  const active = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? "bg-neutral-950 text-white shadow-sm"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <Icon name={icon} className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void loadCommunity()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-600 transition hover:border-yellow-400 hover:text-stone-900 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-stone-200 bg-white p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 animate-pulse rounded-full bg-stone-200" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 animate-pulse rounded bg-stone-200" />
                        <div className="h-2.5 w-20 animate-pulse rounded bg-stone-100" />
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
                    </div>
                    <div className="mt-5 h-40 animate-pulse rounded-xl bg-stone-100" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                  <Icon name="comment" className="h-7 w-7" />
                </span>

                <h3 className="text-lg font-bold">
                  {filter === "mine"
                    ? "You haven't posted yet"
                    : filter === "photos"
                      ? "No photo posts yet"
                      : "No posts yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                  {filter === "all"
                    ? "Be the first to share something with the community."
                    : "Share an update from your latest session to get started."}
                </p>

                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-6 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
                  >
                    Show all posts
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post, index) => {
                  const author = post.profiles?.full_name || "SportGy member";

                  const postLikes = likes.filter(
                    (like) => like.post_id === post.id
                  );

                  const likedByMe = postLikes.some(
                    (like) => like.user_id === userId
                  );

                  const postComments = comments.filter(
                    (comment) => comment.post_id === post.id
                  );

                  const isOwner = post.user_id === userId;
                  const commentsAreOpen = openComments === post.id;

                  const isLong =
                    (post.content?.length ?? 0) > LONG_POST_LENGTH;
                  const expanded = expandedPosts.has(post.id);

                  return (
                    <article
                      key={post.id}
                      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
                      className="post-in overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:border-yellow-300 hover:shadow-lg hover:shadow-stone-900/5"
                    >
                      {/* Post author */}
                      <div className="flex items-center gap-3 p-5">
                        <Avatar name={author} highlight={isOwner} />

                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate font-bold text-stone-900">
                            <span className="truncate">{author}</span>
                            {isOwner && (
                              <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
                                You
                              </span>
                            )}
                          </p>

                          <p
                            className="mt-0.5 text-xs text-stone-500"
                            title={formatDate(post.created_at)}
                          >
                            {timeAgo(post.created_at)}
                          </p>
                        </div>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setPostToDelete(post)}
                            aria-label="Delete post"
                            className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Icon name="trash" className="h-[18px] w-[18px]" />
                          </button>
                        )}
                      </div>

                      {/* Post content */}
                      {post.content && (
                        <div className="px-5 pb-4">
                          <p
                            className={`whitespace-pre-wrap break-words text-sm leading-7 text-stone-700 ${
                              isLong && !expanded ? "line-clamp-4" : ""
                            }`}
                          >
                            {post.content}
                          </p>

                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(post.id)}
                              className="mt-1 text-sm font-semibold text-yellow-700 hover:underline"
                            >
                              {expanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Post image */}
                      {post.image_url && (
                        <button
                          type="button"
                          onClick={() => setLightbox(post.image_url)}
                          aria-label="View image full size"
                          className="block w-full cursor-zoom-in overflow-hidden bg-stone-100"
                        >
                          <img
                            src={post.image_url}
                            alt={`Post by ${author}`}
                            loading="lazy"
                            className="max-h-[560px] w-full object-cover transition duration-500 hover:scale-[1.02]"
                          />
                        </button>
                      )}

                      {/* Like and comment actions */}
                      <div className="flex items-center gap-2 border-t border-stone-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void toggleLike(post.id)}
                          aria-pressed={likedByMe}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            likedByMe
                              ? "text-red-500"
                              : "text-stone-500 hover:bg-red-50 hover:text-red-500"
                          }`}
                        >
                          <span className={likeBurst === post.id ? "pop" : ""}>
                            <Icon name="heart" filled={likedByMe} />
                          </span>

                          {postLikes.length}
                          <span className="sr-only">
                            {postLikes.length === 1 ? "like" : "likes"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenComments(commentsAreOpen ? null : post.id)
                          }
                          aria-expanded={commentsAreOpen}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            commentsAreOpen
                              ? "bg-yellow-50 text-yellow-700"
                              : "text-stone-500 hover:bg-yellow-50 hover:text-yellow-700"
                          }`}
                        >
                          <Icon name="comment" />
                          {postComments.length}
                          <span className="sr-only">
                            {postComments.length === 1
                              ? "comment"
                              : "comments"}
                          </span>
                        </button>
                      </div>

                      {/* Comments section */}
                      {commentsAreOpen && (
                        <div className="slide-down border-t border-stone-100 bg-[#FBF8F1] p-5">
                          <div className="mb-4 space-y-4">
                            {postComments.map((comment) => (
                              <div key={comment.id} className="flex gap-3">
                                <Avatar
                                  name={comment.profiles?.full_name}
                                  size="sm"
                                  highlight={comment.user_id === userId}
                                />

                                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-stone-200 bg-white p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-stone-900">
                                      {comment.profiles?.full_name ||
                                        "SportGy member"}
                                    </p>

                                    {comment.user_id === userId && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void deleteComment(comment)
                                        }
                                        className="text-xs font-semibold text-red-500 hover:underline"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>

                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600">
                                    {comment.content}
                                  </p>

                                  <p
                                    className="mt-2 text-xs text-stone-400"
                                    title={formatDate(comment.created_at)}
                                  >
                                    {timeAgo(comment.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {postComments.length === 0 && (
                              <p className="text-sm text-stone-500">
                                No comments yet. Start the conversation!
                              </p>
                            )}
                          </div>

                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void addComment(post.id);
                            }}
                            className="flex gap-2"
                          >
                            <input
                              value={commentInputs[post.id] ?? ""}
                              onChange={(event) =>
                                setCommentInputs((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))
                              }
                              placeholder={
                                userId
                                  ? "Write a comment..."
                                  : "Log in to comment"
                              }
                              aria-label="Write a comment"
                              maxLength={2000}
                              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
                            />

                            <button
                              type="submit"
                              disabled={
                                sendingComment === post.id ||
                                !(commentInputs[post.id] ?? "").trim()
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {sendingComment === post.id ? (
                                "..."
                              ) : (
                                <>
                                  <Icon name="send" className="h-4 w-4" />
                                  Send
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ========================================
          DELETE CONFIRMATION
      ======================================== */}

      {postToDelete && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setPostToDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="modal-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon name="trash" className="h-6 w-6" />
            </span>

            <h2 id="delete-title" className="text-lg font-extrabold">
              Delete this post?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              The post, its likes and its comments will be removed. This can't
              be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Keep post
              </button>

              <button
                type="button"
                onClick={() => void confirmDeletePost()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          IMAGE LIGHTBOX
      ======================================== */}

      {lightbox && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close image"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <Icon name="close" />
          </button>

          <img
            src={lightbox}
            alt="Full size post"
            className="modal-in max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

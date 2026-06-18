import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  useDemoStore,
  postTask,
  selectWorker,
  confirmStart,
  confirmCompletion,
  addReview,
  toggleSavedWorker,
  rebookWorker,
} from '../../demo/store.js';
import { StatusBadge, PaymentBadge, TierBadge, Stars } from '../../demo/ui.jsx';

export default function RequesterDashboard() {
  const { user } = useAuth();
  const store = useDemoStore();
  const requester = { user_id: user.user_id, name: user.name };

  const openTasks = store.tasks.filter((t) => t.status === 'open');

  return (
    <div className="wide">
      <h1>Requester dashboard</h1>
      <p className="subtitle">Welcome, {user.name}. Post a task, choose a worker, and track it to done.</p>

      <PostTask categories={store.categories} requester={requester} />

      <h2 className="section-title">Find a worker</h2>
      {openTasks.length === 0 && (
        <p className="meta">Post a task above, then assign one of these workers to it.</p>
      )}
      <div className="grid2">
        {store.workers.map((w) => (
          <WorkerCard
            key={w.worker_id}
            worker={w}
            openTasks={openTasks}
            saved={store.savedWorkerIds.includes(w.worker_id)}
          />
        ))}
      </div>

      <h2 className="section-title">Your bookings</h2>
      {store.bookings.length === 0 && (
        <div className="empty">No bookings yet. Assign a worker to a task to start the trust loop.</div>
      )}
      {store.bookings.map((b) => (
        <BookingCard key={b.booking_id} b={b} requester={requester} />
      ))}

      <SavedWorkers store={store} requester={requester} />
    </div>
  );
}

function PostTask({ categories, requester }) {
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', location: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    postTask({ ...form, requester });
    setForm({ title: '', categoryId: '', description: '', location: '' });
  }

  return (
    <>
      <h2 className="section-title">Post a task</h2>
      <div className="card">
        <form className="form" onSubmit={submit} style={{ maxWidth: '100%' }}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Fix a leaking kitchen tap"
            />
          </label>
          <label>
            Category
            <select className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Location (optional)
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kimironko" />
          </label>
          <button className="btn-primary" type="submit">Post task</button>
        </form>
      </div>
    </>
  );
}

function WorkerCard({ worker, openTasks, saved }) {
  const [taskId, setTaskId] = useState('');

  function assign() {
    if (!taskId) return;
    selectWorker({ taskId, workerId: worker.worker_id });
    setTaskId('');
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{worker.name}</div>
        <Stars rating={worker.rating} />
      </div>
      <div className="meta">{worker.skills}</div>
      <p className="meta" style={{ marginTop: '0.25rem' }}>{worker.bio}</p>
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <TierBadge tier={worker.tier} />
      </div>
      <div className="actions">
        <select className="select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">Assign to task…</option>
          {openTasks.map((t) => (
            <option key={t.task_id} value={t.task_id}>{t.title}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={assign} disabled={!taskId}>Select</button>
        <button className="btn-secondary" onClick={() => toggleSavedWorker(worker.worker_id)}>
          {saved ? '★ Saved' : '☆ Save'}
        </button>
      </div>
    </div>
  );
}

function BookingCard({ b, requester }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{b.taskTitle}</div>
          <div className="meta">Worker: {b.workerName}</div>
        </div>
        <div className="row">
          <StatusBadge status={b.status} />
          <PaymentBadge payment={b.payment} />
        </div>
      </div>

      <div className="actions">
        {b.status === 'pending' && <span className="meta">Waiting for {b.workerName} to accept.</span>}

        {b.status === 'accepted' && !b.checkedIn && (
          <span className="meta">Accepted — waiting for {b.workerName} to check in.</span>
        )}

        {b.checkedIn && !b.startConfirmed && (
          <button className="btn-primary" onClick={() => confirmStart(b.booking_id)}>Confirm start</button>
        )}

        {b.startConfirmed && !b.checkedOut && (
          <span className="meta">In progress — waiting for {b.workerName} to check out.</span>
        )}

        {b.checkedOut && !b.endConfirmed && (
          <button className="btn-primary" onClick={() => confirmCompletion(b.booking_id)}>
            Confirm completion
          </button>
        )}

        {b.status === 'completed' && !b.review && <ReviewForm bookingId={b.booking_id} />}

        {b.review && (
          <div className="row">
            <span className="badge badge--star">Reviewed {b.review.rating}★</span>
            {b.review.comment && <span className="meta">“{b.review.comment}”</span>}
            <button className="btn-mini" onClick={() => rebookWorker({ workerId: b.worker_id, requester })}>
              Rebook {b.workerName}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewForm({ bookingId }) {
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');

  function submit(e) {
    e.preventDefault();
    addReview({ bookingId, rating, comment });
  }

  return (
    <form className="row" onSubmit={submit} style={{ width: '100%' }}>
      <span className="meta">Leave a review:</span>
      <select className="select" value={rating} onChange={(e) => setRating(e.target.value)}>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>{n} ★</option>
        ))}
      </select>
      <input
        className="select"
        style={{ flex: 1, minWidth: '140px' }}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How did it go?"
      />
      <button className="btn-primary" type="submit">Submit review</button>
    </form>
  );
}

function SavedWorkers({ store, requester }) {
  const saved = store.workers.filter((w) => store.savedWorkerIds.includes(w.worker_id));
  if (saved.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Saved workers</h2>
      {saved.map((w) => (
        <div className="card" key={w.worker_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{w.name}</div>
              <div className="meta">{w.skills}</div>
            </div>
            <button className="btn-primary" onClick={() => rebookWorker({ workerId: w.worker_id, requester })}>
              Rebook in one tap
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

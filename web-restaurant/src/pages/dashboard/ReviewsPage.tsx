import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Star } from 'lucide-react';
import { ApiClientError } from '@zestroute/shared';
import { EmptyState, InputField, Modal, PrimaryButton, SecondaryButton, useToast } from '../../components/ui';
import { useRestaurantList } from '../../hooks/useRestaurantData';
import { restaurantHttpClient } from '../../services/apiClient';
import { useRestaurantStore } from '../../store/useRestaurantStore';

interface ReviewRow {
  id: string;
  customerName: string;
  restaurantRating: number;
  foodRating: number;
  comment: string;
  ownerReply?: string;
}

export const ReviewsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId);
  const { data } = useRestaurantList<ReviewRow>('reviews');
  const [replyTarget, setReplyTarget] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Customer Reviews &amp; Feedback</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--zr-text-secondary)' }}>
          Respond professionally to verified customer reviews in real time.
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No customer reviews yet"
          description="Verified customer ratings, photos, and feedback for delivered orders will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((r) => (
            <div key={r.id} className="zr-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong>{r.customerName}</strong>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} fill="#FFC857" color="#FFC857" /> Restaurant: {r.restaurantRating.toFixed(1)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} fill="#F47B20" color="#F47B20" /> Food: {r.foodRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>{r.comment || 'Rated order'}</p>
              {r.ownerReply ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--zr-bg-subtle, rgba(244, 123, 32, 0.08))',
                    fontSize: 13,
                  }}
                >
                  <strong>Your Reply:</strong> {r.ownerReply}
                </div>
              ) : (
                <div>
                  <SecondaryButton
                    onClick={() => {
                      setReplyTarget(r);
                      setReplyText('');
                    }}
                  >
                    <MessageSquare size={14} /> Reply to Customer
                  </SecondaryButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(replyTarget)}
        onClose={() => setReplyTarget(null)}
        title="Reply to Customer Review"
        footer={
          <>
            <SecondaryButton onClick={() => setReplyTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={async () => {
                if (!restaurantId || !replyTarget || !replyText.trim()) {
                  showToast('Please enter a reply message', 'error');
                  return;
                }
                try {
                  await restaurantHttpClient.post(
                    `/restaurant/${restaurantId}/reviews/${replyTarget.id}/reply`,
                    { ownerReply: replyText.trim() }
                  );
                  await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, 'reviews'] });
                  setReplyTarget(null);
                  setReplyText('');
                  showToast('Reply posted to MongoDB!', 'success');
                } catch (err) {
                  showToast(err instanceof ApiClientError ? err.message : 'Failed to post reply', 'error');
                }
              }}
            >
              Post Reply
            </PrimaryButton>
          </>
        }
      >
        <InputField
          label="Your Response"
          placeholder="Thank you for your feedback..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
      </Modal>
    </div>
  );
};

import React from 'react';
import { Clock, Plus, Star, Utensils } from 'lucide-react';
import {
  formatMoney,
  type CategoryCardData,
  type FoodCardData,
  type RestaurantCardData,
} from '@zestroute/shared';
import { DiscountBadge, StatusBadge } from './Badges';
import { PrimaryButton } from './Button';

export const CategoryCard: React.FC<{
  category: CategoryCardData;
  selected?: boolean;
  onClick?: () => void;
}> = ({ category, selected = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="zr-card"
    style={{
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      minWidth: 100,
      cursor: 'pointer',
      borderColor: selected ? 'var(--zr-primary)' : 'var(--zr-border)',
      backgroundColor: selected ? 'var(--zr-primary-soft)' : 'var(--zr-surface)',
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--zr-radius-full)',
        backgroundColor: 'var(--zr-surface-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {category.imageUrl ? (
        <img
          src={category.imageUrl}
          alt={category.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Utensils size={20} color="var(--zr-primary)" />
      )}
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--zr-text)' }}>{category.name}</span>
  </button>
);

export const RestaurantCard: React.FC<{
  restaurant: RestaurantCardData;
  onPress?: () => void;
}> = ({ restaurant, onPress }) => (
  <article
    className="zr-card"
    onClick={onPress}
    style={{ overflow: 'hidden', cursor: onPress ? 'pointer' : 'default' }}
  >
    <div
      style={{
        position: 'relative',
        height: 148,
        backgroundColor: 'var(--zr-skeleton-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {restaurant.coverUrl ? (
        <img
          src={restaurant.coverUrl}
          alt={restaurant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Utensils size={32} color="var(--zr-text-secondary)" />
      )}
      <div
        style={{
          position: 'absolute',
          top: 10,
          insetInlineStart: 10,
          display: 'flex',
          gap: 6,
        }}
      >
        <StatusBadge
          label={restaurant.isOpen ? 'Open' : 'Closed'}
          tone={restaurant.isOpen ? 'success' : 'error'}
        />
        {restaurant.discountBadgeText && <DiscountBadge text={restaurant.discountBadgeText} />}
      </div>
    </div>

    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{restaurant.name}</h3>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <Star size={14} fill="#FFC857" color="#FFC857" />
          {restaurant.rating.toFixed(1)}
        </span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>{restaurant.cuisineLabel}</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          color: 'var(--zr-text-secondary)',
          marginTop: 4,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={13} /> {restaurant.deliveryTimeLabel}
        </span>
        <span>
          {restaurant.deliveryFeeMinor === 0
            ? 'Free Delivery'
            : `Delivery ${formatMoney(restaurant.deliveryFeeMinor)}`}
        </span>
      </div>
    </div>
  </article>
);

export const FoodCard: React.FC<{
  food: FoodCardData;
  onAdd?: () => void;
  onPress?: () => void;
}> = ({ food, onAdd, onPress }) => {
  const effectivePrice = food.discountPriceMinor ?? food.regularPriceMinor;
  return (
    <article
      className="zr-card"
      style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: onPress ? 'pointer' : 'default' }}
      onClick={onPress}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 'var(--zr-radius-md)',
          backgroundColor: 'var(--zr-skeleton-base)',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {food.imageUrl ? (
          <img src={food.imageUrl} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Utensils size={24} color="var(--zr-text-secondary)" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{food.name}</h4>
          {food.discountBadgeText && <DiscountBadge text={food.discountBadgeText} />}
        </div>
        {food.description && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--zr-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {food.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--zr-primary)' }}>
              {formatMoney(effectivePrice)}
            </span>
            {food.discountPriceMinor && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--zr-text-secondary)',
                  textDecoration: 'line-through',
                }}
              >
                {formatMoney(food.regularPriceMinor)}
              </span>
            )}
          </div>
          {onAdd && (
            <button
              type="button"
              className="zr-icon-btn"
              aria-label={`Add ${food.name}`}
              disabled={!food.isAvailable}
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              style={{
                width: 34,
                height: 34,
                backgroundColor: food.isAvailable ? 'var(--zr-primary)' : 'var(--zr-border)',
                color: '#fff',
                border: 'none',
              }}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export const ProductDetailCard: React.FC<{
  food: FoodCardData;
  ingredients?: string[];
  onAddToCart?: () => void;
}> = ({ food, ingredients = [], onAddToCart }) => {
  const effectivePrice = food.discountPriceMinor ?? food.regularPriceMinor;
  return (
    <div className="zr-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{food.name}</h2>
            {food.restaurantName && (
              <span style={{ fontSize: 13, color: 'var(--zr-text-secondary)' }}>{food.restaurantName}</span>
            )}
          </div>
          <StatusBadge label={food.isAvailable ? 'Available' : 'Out of Stock'} tone={food.isAvailable ? 'success' : 'error'} />
        </div>
        {food.description && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--zr-text-secondary)' }}>{food.description}</p>
        )}
        {ingredients.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ingredients.map((ing) => (
              <StatusBadge key={ing} label={ing} tone="neutral" />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--zr-primary)' }}>
            {formatMoney(effectivePrice)}
          </span>
          <PrimaryButton disabled={!food.isAvailable} onClick={onAddToCart}>
            Add to Cart
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import StayTabs from '../../components/portal/stay/StayTabs';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderTabs(entry = '/portal/stay') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <StayTabs>{(activeTab) => <div data-testid="active-tab">{activeTab}</div>}</StayTabs>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('StayTabs', () => {
  it('membaca deep-link listrik dan menjaga tab sebagai sumber kebenaran URL', async () => {
    renderTabs('/portal/stay?tab=listrik');

    expect(screen.getByTestId('active-tab')).toHaveTextContent('listrik');
    expect(document.getElementById('stay-tab-listrik')).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(document.getElementById('stay-tab-kamar')!);
    expect(screen.getByTestId('active-tab')).toHaveTextContent('kamar');
    expect(screen.getByTestId('location')).toHaveTextContent('?tab=kamar');
  });

  it('mendukung Arrow, Home, dan End pada pola tab desktop', async () => {
    renderTabs();
    const firstTab = document.getElementById('stay-tab-ringkasan')!;
    firstTab.focus();

    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('stay-tab-listrik')));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('listrik');

    await userEvent.keyboard('{End}');
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('stay-tab-kamar')));

    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('stay-tab-ringkasan')));
  });
});

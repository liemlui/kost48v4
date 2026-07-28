import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UtilityProjection from '../../components/portal/stay/UtilityProjection';

describe('UtilityProjection', () => {
  it('mengganti snapshot pemakaian secara atomik tanpa angka transisi', () => {
    const { rerender } = render(
      <UtilityProjection
        currentUsageKwh={10}
        freeKwh={30}
        tariffPerKwh={2450}
        estimatedCost={0}
      />,
    );

    expect(screen.getByText('10.0 kWh')).toBeInTheDocument();

    rerender(
      <UtilityProjection
        currentUsageKwh={42.5}
        freeKwh={30}
        tariffPerKwh={2450}
        estimatedCost={30625}
      />,
    );

    expect(screen.getByText('42.5 kWh')).toBeInTheDocument();
    expect(screen.getByText('+12.5 kWh')).toBeInTheDocument();
    expect(screen.queryByText('10.0 kWh')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Pemakaian terhadap jatah listrik' })).toHaveAttribute(
      'aria-valuetext',
      '42.5 kWh terpakai dari jatah 30.0 kWh',
    );
  });

  it('tidak menggambar progress jatah palsu ketika jatah gratis nol', () => {
    render(
      <UtilityProjection
        currentUsageKwh={8}
        freeKwh={0}
        tariffPerKwh={2450}
        estimatedCost={19600}
      />,
    );

    expect(screen.getByText('Tanpa jatah gratis')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Melebihi jatah gratis/i)).not.toBeInTheDocument();
  });
});

import type { Meta, StoryObj } from '@storybook/react';
import StatusBadge from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Common/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Success: Story = {
  args: { status: 'SUCCESS', customLabel: 'Aman' },
};

export const Warning: Story = {
  args: { status: 'WARNING', customLabel: 'Perhatian' },
};

export const Danger: Story = {
  args: { status: 'DANGER', customLabel: 'Kritis' },
};

export const Info: Story = {
  args: { status: 'INFO', customLabel: 'Info' },
};

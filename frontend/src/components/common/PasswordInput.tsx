import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap';

type PasswordInputProps = Omit<FormControlProps, 'type'>;

export default function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup>
      <Form.Control
        {...props}
        type={show ? 'text' : 'password'}
      />
      <Button
        variant="outline-secondary"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        size="sm"
        className="px-2"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 40 }}
        title={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? '🙈' : '👁'}
      </Button>
    </InputGroup>
  );
}
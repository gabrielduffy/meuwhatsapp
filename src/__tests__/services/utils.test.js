// Basic utility function tests
describe('Utility Functions', () => {
  describe('String utilities', () => {
    test('should validate phone number format', () => {
      const phoneRegex = /^[1-9]{2}9?[0-9]{8}$/;
      
      expect(phoneRegex.test('11999999999')).toBe(true);
      expect(phoneRegex.test('21987654321')).toBe(true);
      expect(phoneRegex.test('invalid')).toBe(false);
      expect(phoneRegex.test('123')).toBe(false);
    });

    test('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
    });
  });

  describe('Number utilities', () => {
    test('should format currency values', () => {
      const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      };

      expect(formatCurrency(1000)).toContain('1.000');
      expect(formatCurrency(1000)).toContain('R$');
    });

    test('should calculate percentages', () => {
      const calculatePercentage = (value, total) => {
        if (total === 0) return 0;
        return (value / total) * 100;
      };

      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(100, 0)).toBe(0);
    });
  });

  describe('Date utilities', () => {
    test('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = date.toLocaleDateString('pt-BR');
      
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    test('should calculate date differences', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const diffMs = date2 - date1;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(1);
    });
  });
});

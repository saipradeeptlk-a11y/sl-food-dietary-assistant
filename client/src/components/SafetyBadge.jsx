function SafetyBadge({ safety }) {
    const styles = {
        safe: { label: 'Safe', color: '#0F2B1A', bg: '#7FB489' },
        check_with_restaurant: { label: 'Check with restaurant', color: '#3A2606', bg: '#E8B84B' },
        unsafe: { label: 'Contains flagged ingredient', color: '#2B0D08', bg: '#C15A4A' },
        unknown: { label: 'Not in our data', color: '#F5EBDD', bg: '#4A3A28' }
    };

    const style = styles[safety] || styles.unknown;

    return (
        <span className="safety-badge" style={{ backgroundColor: style.bg, color: style.color }}>
            {style.label}
        </span>
    );
}

export default SafetyBadge;
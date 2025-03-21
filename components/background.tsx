export function Background() {
    return (
      <div style={styles.backgroundMain}>
        <div style={styles.backgroundMainBefore} />
        <div style={styles.backgroundMainAfter} />
        <div style={styles.backgroundContent} />
      </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    backgroundMain: {
        width: "100%",
        minHeight: "100vh",
        position: "fixed",
        zIndex: 1,
        display: "flex",
        justifyContent: "center",
        padding: "120px 24px 160px 24px",
        pointerEvents: "none",
        background: "linear-gradient(159deg, #0F123B 14.25%, #090D2E 56.45%, #020515 86.14%)",
    },
    backgroundMainBefore: {
        background: "none",
        position: "absolute",
        content: '""',
        zIndex: 1,
        width: "100%",
        height: "100%",
        top: 0,
    },
    backgroundMainAfter: {
        content: '""',
        backgroundImage: "none",
        zIndex: 2,
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        opacity: 0,
    },
    backgroundContent: {
        zIndex: 3,
        width: "100%",
        maxWidth: "640px",
        position: "absolute",
        height: "100%",
        top: "80px",
        opacity: 0,
    },
};
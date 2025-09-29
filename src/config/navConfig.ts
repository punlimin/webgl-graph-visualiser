interface NavItem {
    url: string;
    title: string;
    label: string;
}

export const navConfig: NavItem[] = [
    {
        url: "/",
        title: "WebGL Graph Visualiser",
        label: "Home",
    },
    {
        url: "/scatter",
        title: "Scatter: Progressive / LOD",
        label: "Scatter Plot",
    },
    {
        url: "/imageViewer",
        title: "Image Viewer",
        label: "Image Viewer",
    },
];

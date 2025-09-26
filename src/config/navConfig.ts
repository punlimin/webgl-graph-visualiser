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
        url: "/about",
        title: "About",
        label: "About",
    },
    {
        url: "/scatter",
        title: "WebGL Scatter — Progressive / LOD",
        label: "Scatter Plot",
    },
];

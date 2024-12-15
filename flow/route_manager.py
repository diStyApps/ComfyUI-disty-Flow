from aiohttp import web
from pathlib import Path

class RouteManager:

    @staticmethod
    def create_routes(base_path: str, app_dir: Path) -> web.RouteTableDef:
        routes = web.RouteTableDef()
        index_html = app_dir / 'index.html'

        @routes.get(f"/{base_path}")
        async def serve_html(request: web.Request) -> web.FileResponse:
            return web.FileResponse(index_html)

        for static_dir in ['css', 'js', 'media']:
            static_path = app_dir / static_dir
            if static_path.is_dir():
                routes.static(f"/{static_dir}/", path=static_path)

        routes.static(f"/{base_path}/", path=app_dir, show_index=False)
        return routes

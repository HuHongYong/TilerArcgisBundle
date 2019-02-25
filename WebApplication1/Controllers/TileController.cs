using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using TilerArcgisBundle;

namespace WebApplication1.Controllers
{
    public class TileController : Controller
    {
        // GET: Tile
        public ActionResult GetTile(int x, int y, int z)
        {
            try
            {
                ArcgisBundleHelper Helper = new ArcgisBundleHelper(@"G:\feiq\Recv Files\Map_test\map");
                var data = Helper.GetTile(x, y, z);
                return File(data, "image/jpeg");
            }
            catch (Exception ex)
            {
                throw;
            }
        }
    }
}
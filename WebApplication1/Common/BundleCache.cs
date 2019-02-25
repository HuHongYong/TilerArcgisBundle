using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Common
{
    /// <summary>
    /// 切片缓存文件
    /// </summary>
    public class BundleCache
    {
        /// <summary>
        ///    level+GetFileNameWithoutExtension(bundleFileName)
        /// </summary>
        public string BundleId { get; set; }
        /// <summary>
        /// 首次创建时间
        /// </summary>
        public DateTime CTime { get; set; }
        /// <summary>
        /// 最后一次访问时间
        /// </summary>
        public DateTime LastTime { get; set; }
        /// <summary>
        /// .Bundle切片文件数组
        /// </summary>
        public byte[] BundleData { get; set; }
        /// <summary>
        ///  .Bundlx切片文件索引数组
        /// </summary>
        public byte[] BundlxData { get; set; }
    }
}